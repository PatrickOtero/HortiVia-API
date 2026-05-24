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
import type { CreateProductGuideSectionDto } from './dto/create-product-guide-section.dto';
import type { CreateProductImageDto } from './dto/create-product-image.dto';
import type { CreateProductImageUploadDto } from './dto/create-product-image-upload.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQueryDto } from './dto/list-products-query.dto';
import type { ProductNutrientDto } from './dto/product-nutrient.dto';
import type { UpdateProductGuideSectionDto } from './dto/update-product-guide-section.dto';
import type { UpdateProductImageFileDto } from './dto/update-product-image-file.dto';
import type { UpdateProductImageDto } from './dto/update-product-image.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import {
  toProductDetailResponse,
  toProductGuideSectionResponse,
  toProductImageResponse,
  toProductListItemResponse,
} from './mappers/product-response.mapper';
import { ProductsRepository } from './products.repository';
import type {
  ProductDetailResponse,
  ProductGuideSectionResponse,
  ProductImageResponse,
  ProductsListResponse,
} from './types/product-response';
import { slugifyProductName } from './utils/slug.util';

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

  async createImage(
    productId: string,
    createProductImageDto: CreateProductImageDto,
  ): Promise<ProductImageResponse> {
    await this.requireActiveProduct(productId);

    const createdImage = await this.productsRepository.createProductImage(productId, {
      productId,
      url: createProductImageDto.url.trim(),
      alt: this.normalizeOptionalText(createProductImageDto.alt),
      caption: this.normalizeOptionalText(createProductImageDto.caption),
      kind: createProductImageDto.kind,
      sortOrder: createProductImageDto.sortOrder ?? 0,
      isPrimary: createProductImageDto.isPrimary ?? false,
    });

    if (createdImage.isPrimary) {
      await this.productsRepository.clearPrimaryProductImages(
        productId,
        createdImage.id,
      );
    }

    return toProductImageResponse(createdImage);
  }

  async createImageWithUpload(
    productId: string,
    createProductImageUploadDto: CreateProductImageUploadDto,
    file?: UploadFile,
  ): Promise<ProductImageResponse> {
    await this.requireActiveProduct(productId);
    const imageFile = this.validateImageFile(file);
    let createdImageId: string | null = null;

    try {
      const createdImage = await this.productsRepository.createProductImage(productId, {
        productId,
        url: '',
        alt: this.normalizeOptionalText(createProductImageUploadDto.alt),
        caption: this.normalizeOptionalText(createProductImageUploadDto.caption),
        kind: createProductImageUploadDto.kind,
        sortOrder: createProductImageUploadDto.sortOrder ?? 0,
        isPrimary: createProductImageUploadDto.isPrimary ?? false,
      });
      createdImageId = createdImage.id;

      const uploadResult = await this.storageService.uploadProductGalleryImage(
        productId,
        createdImage.id,
        imageFile,
      );

      const updatedImage = await this.productsRepository.updateProductImage(
        createdImage.id,
        {
          url: uploadResult.url,
        },
      );

      if (updatedImage.isPrimary) {
        await this.productsRepository.clearPrimaryProductImages(
          productId,
          updatedImage.id,
        );
      }

      return toProductImageResponse(updatedImage);
    } catch {
      if (createdImageId) {
        await this.productsRepository
          .deleteProductImage(createdImageId)
          .catch(() => undefined);
      }

      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  async updateImage(
    productId: string,
    imageId: string,
    updateProductImageDto: UpdateProductImageDto,
  ): Promise<ProductImageResponse> {
    await this.requireActiveProduct(productId);
    const existingImage = await this.requireProductImage(productId, imageId);
    const data: Prisma.ProductImageUpdateInput = {};

    if (updateProductImageDto.url !== undefined) {
      data.url = updateProductImageDto.url.trim();
    }

    if (updateProductImageDto.alt !== undefined) {
      data.alt = this.normalizeOptionalText(updateProductImageDto.alt);
    }

    if (updateProductImageDto.caption !== undefined) {
      data.caption = this.normalizeOptionalText(updateProductImageDto.caption);
    }

    if (updateProductImageDto.kind !== undefined) {
      data.kind = updateProductImageDto.kind;
    }

    if (updateProductImageDto.sortOrder !== undefined) {
      data.sortOrder = updateProductImageDto.sortOrder;
    }

    if (updateProductImageDto.isPrimary !== undefined) {
      data.isPrimary = updateProductImageDto.isPrimary;
    }

    if (Object.keys(data).length === 0) {
      return toProductImageResponse(existingImage);
    }

    const updatedImage = await this.productsRepository.updateProductImage(imageId, data);

    if (updatedImage.isPrimary) {
      await this.productsRepository.clearPrimaryProductImages(productId, imageId);
    }

    return toProductImageResponse(updatedImage);
  }

  async replaceImageFile(
    productId: string,
    imageId: string,
    updateProductImageFileDto: UpdateProductImageFileDto,
    file?: UploadFile,
  ): Promise<ProductImageResponse> {
    await this.requireActiveProduct(productId);
    await this.requireProductImage(productId, imageId);
    const imageFile = this.validateImageFile(file);

    try {
      const uploadResult = await this.storageService.uploadProductGalleryImage(
        productId,
        imageId,
        imageFile,
      );

      const data: Prisma.ProductImageUpdateInput = {
        url: uploadResult.url,
      };

      if (updateProductImageFileDto.kind !== undefined) {
        data.kind = updateProductImageFileDto.kind;
      }

      if (updateProductImageFileDto.alt !== undefined) {
        data.alt = this.normalizeOptionalText(updateProductImageFileDto.alt);
      }

      if (updateProductImageFileDto.caption !== undefined) {
        data.caption = this.normalizeOptionalText(updateProductImageFileDto.caption);
      }

      if (updateProductImageFileDto.sortOrder !== undefined) {
        data.sortOrder = updateProductImageFileDto.sortOrder;
      }

      if (updateProductImageFileDto.isPrimary !== undefined) {
        data.isPrimary = updateProductImageFileDto.isPrimary;
      }

      const updatedImage = await this.productsRepository.updateProductImage(
        imageId,
        data,
      );

      if (updatedImage.isPrimary) {
        await this.productsRepository.clearPrimaryProductImages(productId, imageId);
      }

      return toProductImageResponse(updatedImage);
    } catch {
      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  async deleteImage(productId: string, imageId: string) {
    await this.requireActiveProduct(productId);
    await this.requireProductImage(productId, imageId);
    await this.productsRepository.deleteProductImage(imageId);

    return {
      message: 'Imagem removida.',
    };
  }

  async createGuideSection(
    productId: string,
    createProductGuideSectionDto: CreateProductGuideSectionDto,
  ): Promise<ProductGuideSectionResponse> {
    await this.requireActiveProduct(productId);

    const createdSection = await this.productsRepository.createProductGuideSection(
      productId,
      {
        productId,
        kind: createProductGuideSectionDto.kind,
        title: this.normalizeText(createProductGuideSectionDto.title),
        body: this.normalizeText(createProductGuideSectionDto.body),
        imageUrl: this.normalizeOptionalText(createProductGuideSectionDto.imageUrl),
        imageAlt: this.normalizeOptionalText(createProductGuideSectionDto.imageAlt),
        imageCaption: this.normalizeOptionalText(
          createProductGuideSectionDto.imageCaption,
        ),
        bullets: this.normalizeStringArray(createProductGuideSectionDto.bullets),
        idealPoints: this.normalizeStringArray(
          createProductGuideSectionDto.idealPoints,
        ),
        avoidPoints: this.normalizeStringArray(
          createProductGuideSectionDto.avoidPoints,
        ),
        sortOrder: createProductGuideSectionDto.sortOrder ?? 0,
      },
    );

    return toProductGuideSectionResponse(createdSection);
  }

  async updateGuideSection(
    productId: string,
    sectionId: string,
    updateProductGuideSectionDto: UpdateProductGuideSectionDto,
  ): Promise<ProductGuideSectionResponse> {
    await this.requireActiveProduct(productId);
    const existingSection = await this.requireGuideSection(productId, sectionId);
    const data: Prisma.ProductGuideSectionUpdateInput = {};

    if (updateProductGuideSectionDto.kind !== undefined) {
      data.kind = updateProductGuideSectionDto.kind;
    }

    if (updateProductGuideSectionDto.title !== undefined) {
      data.title = this.normalizeText(updateProductGuideSectionDto.title);
    }

    if (updateProductGuideSectionDto.body !== undefined) {
      data.body = this.normalizeText(updateProductGuideSectionDto.body);
    }

    if (updateProductGuideSectionDto.imageUrl !== undefined) {
      data.imageUrl = this.normalizeOptionalText(updateProductGuideSectionDto.imageUrl);
    }

    if (updateProductGuideSectionDto.imageAlt !== undefined) {
      data.imageAlt = this.normalizeOptionalText(updateProductGuideSectionDto.imageAlt);
    }

    if (updateProductGuideSectionDto.imageCaption !== undefined) {
      data.imageCaption = this.normalizeOptionalText(
        updateProductGuideSectionDto.imageCaption,
      );
    }

    if (updateProductGuideSectionDto.bullets !== undefined) {
      data.bullets = this.normalizeStringArray(updateProductGuideSectionDto.bullets);
    }

    if (updateProductGuideSectionDto.idealPoints !== undefined) {
      data.idealPoints = this.normalizeStringArray(
        updateProductGuideSectionDto.idealPoints,
      );
    }

    if (updateProductGuideSectionDto.avoidPoints !== undefined) {
      data.avoidPoints = this.normalizeStringArray(
        updateProductGuideSectionDto.avoidPoints,
      );
    }

    if (updateProductGuideSectionDto.sortOrder !== undefined) {
      data.sortOrder = updateProductGuideSectionDto.sortOrder;
    }

    if (Object.keys(data).length === 0) {
      return toProductGuideSectionResponse(existingSection);
    }

    const updatedSection = await this.productsRepository.updateProductGuideSection(
      sectionId,
      data,
    );

    return toProductGuideSectionResponse(updatedSection);
  }

  async uploadGuideSectionImage(
    productId: string,
    sectionId: string,
    file?: UploadFile,
  ): Promise<ProductGuideSectionResponse> {
    await this.requireActiveProduct(productId);
    const existingSection = await this.requireGuideSection(productId, sectionId);
    const imageFile = this.validateImageFile(file);

    try {
      const uploadResult = await this.storageService.uploadProductGuideSectionImage(
        productId,
        sectionId,
        imageFile,
      );

      const updatedSection =
        await this.productsRepository.updateProductGuideSectionImage(
          sectionId,
          uploadResult.url,
          existingSection.imageAlt,
        );

      return toProductGuideSectionResponse(updatedSection);
    } catch {
      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  async removeGuideSectionImage(
    productId: string,
    sectionId: string,
  ): Promise<ProductGuideSectionResponse> {
    await this.requireActiveProduct(productId);
    await this.requireGuideSection(productId, sectionId);

    const updatedSection =
      await this.productsRepository.updateProductGuideSectionImage(
        sectionId,
        null,
        null,
      );

    return toProductGuideSectionResponse(updatedSection);
  }

  async deleteGuideSection(productId: string, sectionId: string) {
    await this.requireActiveProduct(productId);
    await this.requireGuideSection(productId, sectionId);
    await this.productsRepository.deleteProductGuideSection(sectionId);

    return {
      message: 'Seção removida.',
    };
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

  private async requireProductImage(productId: string, imageId: string) {
    const image = await this.productsRepository.findProductImageById(imageId);

    if (!image || image.productId !== productId) {
      throw this.buildProductImageNotFoundException();
    }

    return image;
  }

  private async requireGuideSection(productId: string, sectionId: string) {
    const section =
      await this.productsRepository.findProductGuideSectionById(sectionId);

    if (!section || section.productId !== productId) {
      throw this.buildProductGuideSectionNotFoundException();
    }

    return section;
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

  private buildProductImageNotFoundException() {
    return new NotFoundException({
      message: 'Imagem do produto não encontrada.',
      error: 'Not Found',
    });
  }

  private buildProductGuideSectionNotFoundException() {
    return new NotFoundException({
      message: 'Seção do produto não encontrada.',
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
