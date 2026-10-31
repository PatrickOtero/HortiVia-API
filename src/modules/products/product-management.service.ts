import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { toProductDetailResponse } from './mappers/product-response.mapper';
import { ProductsRepository } from './products.repository';
import { ProductAccessService } from './product-access.service';
import { ProductSlugService } from './product-slug.service';
import type { ProductDetailResponse } from './types/product-response';
import {
  normalizeOptionalProductText,
  normalizeProductNutrients,
  normalizeProductStringArray,
  normalizeProductText,
} from './utils/product-content.util';
import {
  isProductPrismaError,
  productNotFoundException,
  productSlugConflictException,
} from './utils/product-errors.util';

@Injectable()
export class ProductManagementService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
    private readonly productSlugService: ProductSlugService,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDetailResponse> {
    const slug = await this.productSlugService.generateUnique(dto.name);
    try {
      const product = await this.productsRepository.create({
        name: normalizeProductText(dto.name),
        slug,
        category: dto.category,
        shortDescription: normalizeProductText(dto.shortDescription),
        description: normalizeOptionalProductText(dto.description),
        imageUrl: normalizeOptionalProductText(dto.imageUrl),
        benefits: normalizeProductStringArray(dto.benefits),
        howToChoose: normalizeProductStringArray(dto.howToChoose),
        howToStore: normalizeProductStringArray(dto.howToStore),
        usageTips: normalizeProductStringArray(dto.usageTips),
        nutrients: normalizeProductNutrients(dto.nutrients),
      });
      return toProductDetailResponse(product);
    } catch (error) {
      if (isProductPrismaError(error, 'P2002')) throw productSlugConflictException();
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDetailResponse> {
    const existing = await this.productAccessService.requireActiveProduct(id);
    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) {
      const name = normalizeProductText(dto.name);
      data.name = name;
      if (name !== existing.name) {
        data.slug = await this.productSlugService.generateUnique(name, existing.id);
      }
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.shortDescription !== undefined) {
      data.shortDescription = normalizeProductText(dto.shortDescription);
    }
    if (dto.description !== undefined) data.description = normalizeOptionalProductText(dto.description);
    if (dto.imageUrl !== undefined) data.imageUrl = normalizeOptionalProductText(dto.imageUrl);
    if (dto.benefits !== undefined) data.benefits = normalizeProductStringArray(dto.benefits);
    if (dto.howToChoose !== undefined) data.howToChoose = normalizeProductStringArray(dto.howToChoose);
    if (dto.howToStore !== undefined) data.howToStore = normalizeProductStringArray(dto.howToStore);
    if (dto.usageTips !== undefined) data.usageTips = normalizeProductStringArray(dto.usageTips);
    if (dto.nutrients !== undefined) data.nutrients = normalizeProductNutrients(dto.nutrients);

    if (Object.keys(data).length === 0) return toProductDetailResponse(existing);

    try {
      return toProductDetailResponse(await this.productsRepository.update(id, data));
    } catch (error) {
      if (isProductPrismaError(error, 'P2025')) throw productNotFoundException();
      if (isProductPrismaError(error, 'P2002')) throw productSlugConflictException();
      throw error;
    }
  }

  async deactivate(id: string) {
    await this.productAccessService.requireActiveProduct(id);
    try {
      await this.productsRepository.deactivate(id);
    } catch (error) {
      if (isProductPrismaError(error, 'P2025')) throw productNotFoundException();
      throw error;
    }
    return { message: 'Produto removido.' };
  }
}
