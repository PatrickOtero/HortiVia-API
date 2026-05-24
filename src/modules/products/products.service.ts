import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../storage/image-upload.constants';
import type { UploadFile } from '../storage/types/upload-file';
import { ProductsRepository } from './products.repository';
import {
  toProductDetailResponse,
  toProductListItemResponse,
} from './mappers/product-response.mapper';
import { slugifyProductName } from './utils/slug.util';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQueryDto } from './dto/list-products-query.dto';
import type { ProductNutrientDto } from './dto/product-nutrient.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type {
  ProductDetailResponse,
  ProductsListResponse,
} from './types/product-response';

@Injectable()
export class ProductsService {
  private readonly defaultPage = 1;
  private readonly defaultLimit = 10;
  private readonly maxLimit = 50;

  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly storageService: StorageService,
  ) {}

  async list(query: ListProductsQueryDto): Promise<ProductsListResponse> {
    const page = query.page ?? this.defaultPage;
    const limit = Math.min(query.limit ?? this.defaultLimit, this.maxLimit);
    const where = this.buildListWhereInput(query);

    const [products, total] = await Promise.all([
      this.productsRepository.findManyWithPagination({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.productsRepository.count(where),
    ]);

    return {
      data: products.map(toProductListItemResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string): Promise<ProductDetailResponse> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw this.buildProductNotFoundException();
    }

    return toProductDetailResponse(product);
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDetailResponse> {
    const slug = await this.generateUniqueSlug(createProductDto.name);

    try {
      const product = await this.productsRepository.create({
        name: this.normalizeText(createProductDto.name),
        slug,
        category: createProductDto.category,
        shortDescription: this.normalizeText(createProductDto.shortDescription),
        description: this.normalizeOptionalText(createProductDto.description),
        imageUrl: this.normalizeOptionalText(createProductDto.imageUrl),
        benefits: this.normalizeStringArray(createProductDto.benefits),
        howToChoose: this.normalizeStringArray(createProductDto.howToChoose),
        howToStore: this.normalizeStringArray(createProductDto.howToStore),
        usageTips: this.normalizeStringArray(createProductDto.usageTips),
        nutrients: this.normalizeNutrients(createProductDto.nutrients),
      });

      return toProductDetailResponse(product);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw this.buildSlugConflictException();
      }

      throw error;
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDetailResponse> {
    const existingProduct = await this.requireActiveProduct(id);
    const data: Prisma.ProductUpdateInput = {};

    if (updateProductDto.name !== undefined) {
      const normalizedName = this.normalizeText(updateProductDto.name);

      data.name = normalizedName;

      if (normalizedName !== existingProduct.name) {
        data.slug = await this.generateUniqueSlug(normalizedName, existingProduct.id);
      }
    }

    if (updateProductDto.category !== undefined) {
      data.category = updateProductDto.category;
    }

    if (updateProductDto.shortDescription !== undefined) {
      data.shortDescription = this.normalizeText(updateProductDto.shortDescription);
    }

    if (updateProductDto.description !== undefined) {
      data.description = this.normalizeOptionalText(updateProductDto.description);
    }

    if (updateProductDto.imageUrl !== undefined) {
      data.imageUrl = this.normalizeOptionalText(updateProductDto.imageUrl);
    }

    if (updateProductDto.benefits !== undefined) {
      data.benefits = this.normalizeStringArray(updateProductDto.benefits);
    }

    if (updateProductDto.howToChoose !== undefined) {
      data.howToChoose = this.normalizeStringArray(updateProductDto.howToChoose);
    }

    if (updateProductDto.howToStore !== undefined) {
      data.howToStore = this.normalizeStringArray(updateProductDto.howToStore);
    }

    if (updateProductDto.usageTips !== undefined) {
      data.usageTips = this.normalizeStringArray(updateProductDto.usageTips);
    }

    if (updateProductDto.nutrients !== undefined) {
      data.nutrients = this.normalizeNutrients(updateProductDto.nutrients);
    }

    if (Object.keys(data).length === 0) {
      return toProductDetailResponse(existingProduct);
    }

    try {
      const product = await this.productsRepository.update(id, data);

      return toProductDetailResponse(product);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildProductNotFoundException();
      }

      if (this.isUniqueConstraintError(error)) {
        throw this.buildSlugConflictException();
      }

      throw error;
    }
  }

  async deactivate(id: string) {
    await this.requireActiveProduct(id);

    try {
      await this.productsRepository.deactivate(id);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildProductNotFoundException();
      }

      throw error;
    }

    return {
      message: 'Produto removido.',
    };
  }

  async uploadImage(id: string, file?: UploadFile): Promise<ProductDetailResponse> {
    await this.requireActiveProduct(id);
    const imageFile = this.validateImageFile(file);

    try {
      const uploadResult = await this.storageService.uploadProductImage(id, imageFile);
      const updatedProduct = await this.productsRepository.updateImageUrl(
        id,
        uploadResult.url,
      );

      return toProductDetailResponse(updatedProduct);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildProductNotFoundException();
      }

      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  private buildListWhereInput(query: ListProductsQueryDto): Prisma.ProductWhereInput {
    const trimmedSearch = query.search?.trim();

    return {
      isActive: true,
      ...(trimmedSearch
        ? {
            name: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
    };
  }

  private async requireActiveProduct(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw this.buildProductNotFoundException();
    }

    return product;
  }

  private async generateUniqueSlug(name: string, currentProductId?: string) {
    const baseSlug = slugifyProductName(name);
    let candidate = baseSlug || 'produto';
    let suffix = 2;
    let existingProduct = await this.productsRepository.findBySlug(candidate);

    while (existingProduct && existingProduct.id !== currentProductId) {
      candidate = `${baseSlug || 'produto'}-${suffix}`;
      existingProduct = await this.productsRepository.findBySlug(candidate);
      suffix += 1;
    }

    return candidate;
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeStringArray(values?: string[]) {
    return (values ?? []).map(value => value.trim()).filter(Boolean);
  }

  private normalizeNutrients(
    nutrients?: ProductNutrientDto[],
  ): Prisma.InputJsonValue {
    const normalizedNutrients = (nutrients ?? [])
      .map(nutrient => ({
        label: nutrient.label.trim(),
        value: nutrient.value.trim(),
      }))
      .filter(nutrient => nutrient.label && nutrient.value);

    return normalizedNutrients as Prisma.InputJsonValue;
  }

  private validateImageFile(file?: UploadFile): UploadFile {
    if (!file) {
      throw new BadRequestException({
        message: 'Envie uma imagem válida.',
        error: 'Bad Request',
      });
    }

    if (file.size > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'A imagem deve ter no máximo 5 MB.',
        error: 'Bad Request',
      });
    }

    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        message: 'Formato de imagem não permitido.',
        error: 'Bad Request',
      });
    }

    return file;
  }

  private buildProductNotFoundException() {
    return new NotFoundException({
      message: 'Produto não encontrado.',
      error: 'Not Found',
    });
  }

  private buildSlugConflictException() {
    return new ConflictException({
      message: 'Não foi possível salvar o produto com um slug único.',
      error: 'Conflict',
    });
  }

  private isUniqueConstraintError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === 'P2002';
  }

  private isRecordNotFoundError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === 'P2025';
  }
}
