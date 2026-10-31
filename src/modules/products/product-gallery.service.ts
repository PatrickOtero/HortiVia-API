import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { CreateProductImageDto } from './dto/create-product-image.dto';
import type { CreateProductImageUploadDto } from './dto/create-product-image-upload.dto';
import type { UpdateProductImageFileDto } from './dto/update-product-image-file.dto';
import type { UpdateProductImageDto } from './dto/update-product-image.dto';
import { toProductImageResponse } from './mappers/product-response.mapper';
import { ProductAccessService } from './product-access.service';
import { ProductsRepository } from './products.repository';
import { StorageService } from '../storage/storage.service';
import type { UploadFile } from '../storage/types/upload-file';
import { validateContentImageFile } from '../storage/image-upload.validation';
import type { ProductImageResponse } from './types/product-response';
import { normalizeOptionalProductText } from './utils/product-content.util';

@Injectable()
export class ProductGalleryService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
    private readonly storageService: StorageService,
  ) {}

  async create(productId: string, dto: CreateProductImageDto): Promise<ProductImageResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    const image = await this.productsRepository.createProductImage(productId, {
      productId,
      url: dto.url.trim(),
      alt: normalizeOptionalProductText(dto.alt),
      caption: normalizeOptionalProductText(dto.caption),
      kind: dto.kind,
      sortOrder: dto.sortOrder ?? 0,
      isPrimary: dto.isPrimary ?? false,
    });
    if (image.isPrimary) {
      await this.productsRepository.clearPrimaryProductImages(productId, image.id);
    }
    return toProductImageResponse(image);
  }

  async createWithUpload(
    productId: string,
    dto: CreateProductImageUploadDto,
    file?: UploadFile,
  ): Promise<ProductImageResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    const imageFile = validateContentImageFile(file);
    let createdImageId: string | null = null;
    try {
      const image = await this.productsRepository.createProductImage(productId, {
        productId,
        url: '',
        alt: normalizeOptionalProductText(dto.alt),
        caption: normalizeOptionalProductText(dto.caption),
        kind: dto.kind,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
      });
      createdImageId = image.id;
      const uploaded = await this.storageService.uploadProductGalleryImage(
        productId,
        image.id,
        imageFile,
      );
      const updated = await this.productsRepository.updateProductImage(image.id, {
        url: uploaded.url,
      });
      if (updated.isPrimary) {
        await this.productsRepository.clearPrimaryProductImages(productId, updated.id);
      }
      return toProductImageResponse(updated);
    } catch {
      if (createdImageId) {
        await this.productsRepository.deleteProductImage(createdImageId).catch(() => undefined);
      }
      throw this.uploadFailed();
    }
  }

  async update(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<ProductImageResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    const existing = await this.productAccessService.requireProductImage(productId, imageId);
    const data: Prisma.ProductImageUpdateInput = {};
    if (dto.url !== undefined) data.url = dto.url.trim();
    if (dto.alt !== undefined) data.alt = normalizeOptionalProductText(dto.alt);
    if (dto.caption !== undefined) data.caption = normalizeOptionalProductText(dto.caption);
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;
    if (Object.keys(data).length === 0) return toProductImageResponse(existing);
    const updated = await this.productsRepository.updateProductImage(imageId, data);
    if (updated.isPrimary) {
      await this.productsRepository.clearPrimaryProductImages(productId, imageId);
    }
    return toProductImageResponse(updated);
  }

  async replaceFile(
    productId: string,
    imageId: string,
    dto: UpdateProductImageFileDto,
    file?: UploadFile,
  ): Promise<ProductImageResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    await this.productAccessService.requireProductImage(productId, imageId);
    const imageFile = validateContentImageFile(file);
    try {
      const uploaded = await this.storageService.uploadProductGalleryImage(
        productId,
        imageId,
        imageFile,
      );
      const data: Prisma.ProductImageUpdateInput = { url: uploaded.url };
      if (dto.kind !== undefined) data.kind = dto.kind;
      if (dto.alt !== undefined) data.alt = normalizeOptionalProductText(dto.alt);
      if (dto.caption !== undefined) data.caption = normalizeOptionalProductText(dto.caption);
      if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
      if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;
      const updated = await this.productsRepository.updateProductImage(imageId, data);
      if (updated.isPrimary) {
        await this.productsRepository.clearPrimaryProductImages(productId, imageId);
      }
      return toProductImageResponse(updated);
    } catch {
      throw this.uploadFailed();
    }
  }

  async delete(productId: string, imageId: string) {
    await this.productAccessService.requireActiveProduct(productId);
    await this.productAccessService.requireProductImage(productId, imageId);
    await this.productsRepository.deleteProductImage(imageId);
    return { message: 'Imagem removida.' };
  }

  private uploadFailed() {
    return new InternalServerErrorException({
      message: 'N\u00e3o foi poss\u00edvel enviar a imagem.',
      error: 'Internal Server Error',
    });
  }
}
