import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';
import type { ProductImageResponse } from './types/product-response';
import { normalizeOptionalProductText } from './utils/product-content.util';

@Injectable()
export class ProductGalleryService {
  private readonly logger = new Logger(ProductGalleryService.name);
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
    private readonly storageService: StorageService,
    private readonly uploadCompensation: StorageUploadCompensationService,
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
    let image: Awaited<ReturnType<ProductsRepository['createProductImage']>>;
    try {
      image = await this.productsRepository.createProductImage(productId, {
        productId,
        url: '',
        alt: normalizeOptionalProductText(dto.alt),
        caption: normalizeOptionalProductText(dto.caption),
        kind: dto.kind,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
      });
    } catch (error) {
      throw this.uploadFailed(error);
    }

    const imageId = image.id;
    let uploaded: Awaited<ReturnType<StorageService['uploadProductGalleryImage']>> | null = null;
    try {
      uploaded = await this.storageService.uploadProductGalleryImage(
        productId,
        image.id,
        imageFile,
      );
    } catch (error) {
      await this.deleteTemporaryImageRow(imageId);
      throw this.uploadFailed(error);
    }

    let updated: Awaited<ReturnType<ProductsRepository['updateProductImage']>>;
    try {
      updated = await this.productsRepository.updateProductImage(imageId, { url: uploaded.url });
    } catch (error) {
      let currentImage;
      try {
        currentImage = await this.productsRepository.findProductImageById(imageId);
      } catch (stateCheckError) {
        this.logger.warn(
          'Gallery image persistence state is uncertain; uploaded object was preserved.',
          stateCheckError instanceof Error ? stateCheckError.name : 'UnknownError',
        );
        throw this.uploadFailed(error);
      }

      if (currentImage?.url === uploaded.url) {
        updated = currentImage;
      } else {
        await this.uploadCompensation.removeIfUnreferenced(uploaded, {
          kind: 'product-gallery',
          productId,
          imageId,
        });
        if (currentImage?.url === '') await this.deleteTemporaryImageRow(imageId);
        throw this.uploadFailed(error);
      }
    }

    if (updated.isPrimary) {
      await this.productsRepository.clearPrimaryProductImages(productId, updated.id);
    }
    return toProductImageResponse(updated);
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
    let uploaded: Awaited<ReturnType<StorageService['uploadProductGalleryImage']>> | null = null;
    try {
      uploaded = await this.storageService.uploadProductGalleryImage(
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
    } catch (error) {
      if (uploaded) {
        await this.uploadCompensation.removeIfUnreferenced(uploaded, {
          kind: 'product-gallery',
          productId,
          imageId,
        });
      }
      throw this.uploadFailed(error);
    }
  }

  async delete(productId: string, imageId: string) {
    await this.productAccessService.requireActiveProduct(productId);
    await this.productAccessService.requireProductImage(productId, imageId);
    await this.productsRepository.deleteProductImage(imageId);
    return { message: 'Imagem removida.' };
  }

  private async deleteTemporaryImageRow(imageId: string) {
    try {
      await this.productsRepository.deleteProductImageIfUrlEmpty(imageId);
    } catch (cleanupError) {
      this.logger.warn(
        'Could not remove a blank temporary gallery record after upload failure.',
        cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
      );
    }
  }

  private uploadFailed(cause?: unknown) {
    return new InternalServerErrorException({
      message: 'N\u00e3o foi poss\u00edvel enviar a imagem.',
      error: 'Internal Server Error',
    }, cause ? { cause } : undefined);
  }
}
