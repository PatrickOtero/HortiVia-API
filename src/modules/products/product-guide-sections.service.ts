import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { CreateProductGuideSectionDto } from './dto/create-product-guide-section.dto';
import type { UpdateProductGuideSectionDto } from './dto/update-product-guide-section.dto';
import { toProductGuideSectionResponse } from './mappers/product-response.mapper';
import { ProductAccessService } from './product-access.service';
import { ProductsRepository } from './products.repository';
import { StorageService } from '../storage/storage.service';
import type { UploadFile } from '../storage/types/upload-file';
import { validateContentImageFile } from '../storage/image-upload.validation';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';
import type { ProductGuideSectionResponse } from './types/product-response';
import {
  normalizeOptionalProductText,
  normalizeProductStringArray,
  normalizeProductText,
} from './utils/product-content.util';

@Injectable()
export class ProductGuideSectionsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
    private readonly storageService: StorageService,
    private readonly uploadCompensation: StorageUploadCompensationService,
  ) {}

  async create(
    productId: string,
    dto: CreateProductGuideSectionDto,
  ): Promise<ProductGuideSectionResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    const section = await this.productsRepository.createProductGuideSection(productId, {
      productId,
      kind: dto.kind,
      title: normalizeProductText(dto.title),
      body: normalizeProductText(dto.body),
      imageUrl: normalizeOptionalProductText(dto.imageUrl),
      imageAlt: normalizeOptionalProductText(dto.imageAlt),
      imageCaption: normalizeOptionalProductText(dto.imageCaption),
      bullets: normalizeProductStringArray(dto.bullets),
      idealPoints: normalizeProductStringArray(dto.idealPoints),
      avoidPoints: normalizeProductStringArray(dto.avoidPoints),
      sortOrder: dto.sortOrder ?? 0,
    });
    return toProductGuideSectionResponse(section);
  }

  async update(
    productId: string,
    sectionId: string,
    dto: UpdateProductGuideSectionDto,
  ): Promise<ProductGuideSectionResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    const existing = await this.productAccessService.requireGuideSection(productId, sectionId);
    const data: Prisma.ProductGuideSectionUpdateInput = {};
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.title !== undefined) data.title = normalizeProductText(dto.title);
    if (dto.body !== undefined) data.body = normalizeProductText(dto.body);
    if (dto.imageUrl !== undefined) data.imageUrl = normalizeOptionalProductText(dto.imageUrl);
    if (dto.imageAlt !== undefined) data.imageAlt = normalizeOptionalProductText(dto.imageAlt);
    if (dto.imageCaption !== undefined) data.imageCaption = normalizeOptionalProductText(dto.imageCaption);
    if (dto.bullets !== undefined) data.bullets = normalizeProductStringArray(dto.bullets);
    if (dto.idealPoints !== undefined) data.idealPoints = normalizeProductStringArray(dto.idealPoints);
    if (dto.avoidPoints !== undefined) data.avoidPoints = normalizeProductStringArray(dto.avoidPoints);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (Object.keys(data).length === 0) return toProductGuideSectionResponse(existing);
    const updated = await this.productsRepository.updateProductGuideSection(sectionId, data);
    return toProductGuideSectionResponse(updated);
  }

  async uploadImage(
    productId: string,
    sectionId: string,
    file?: UploadFile,
  ): Promise<ProductGuideSectionResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    const section = await this.productAccessService.requireGuideSection(productId, sectionId);
    const imageFile = validateContentImageFile(file);
    let uploaded: Awaited<ReturnType<StorageService['uploadProductGuideSectionImage']>> | null = null;
    try {
      uploaded = await this.storageService.uploadProductGuideSectionImage(
        productId,
        sectionId,
        imageFile,
      );
      const updated = await this.productsRepository.updateProductGuideSectionImage(
        sectionId,
        uploaded.url,
        section.imageAlt,
      );
      return toProductGuideSectionResponse(updated);
    } catch (error) {
      if (uploaded) {
        await this.uploadCompensation.removeIfUnreferenced(uploaded, {
          kind: 'product-guide',
          productId,
          sectionId,
        });
      }
      throw this.uploadFailed(error);
    }
  }

  async removeImage(
    productId: string,
    sectionId: string,
  ): Promise<ProductGuideSectionResponse> {
    await this.productAccessService.requireActiveProduct(productId);
    await this.productAccessService.requireGuideSection(productId, sectionId);
    const updated = await this.productsRepository.updateProductGuideSectionImage(
      sectionId,
      null,
      null,
    );
    return toProductGuideSectionResponse(updated);
  }

  async delete(productId: string, sectionId: string) {
    await this.productAccessService.requireActiveProduct(productId);
    await this.productAccessService.requireGuideSection(productId, sectionId);
    await this.productsRepository.deleteProductGuideSection(sectionId);
    return { message: 'Se\u00e7\u00e3o removida.' };
  }

  private uploadFailed(cause?: unknown) {
    return new InternalServerErrorException({
      message: 'N\u00e3o foi poss\u00edvel enviar a imagem.',
      error: 'Internal Server Error',
    }, cause ? { cause } : undefined);
  }
}
