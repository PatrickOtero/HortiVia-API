import { Injectable } from '@nestjs/common';
import {
  createPaginationMeta,
  resolvePagination,
} from '../../common/pagination/pagination';
import type { ListProductsQueryDto } from './dto/list-products-query.dto';
import { toProductDetailResponse, toProductListItemResponse } from './mappers/product-response.mapper';
import { ProductsRepository } from './products.repository';
import type { ProductDetailResponse, ProductsListResponse } from './types/product-response';
import { productNotFoundException } from './utils/product-errors.util';

@Injectable()
export class ProductQueriesService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async list(query: ListProductsQueryDto): Promise<ProductsListResponse> {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();
    const where = {
      isActive: true,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [products, total] = await Promise.all([
      this.productsRepository.findManyWithPagination({ where, skip, take: limit }),
      this.productsRepository.count(where),
    ]);

    return {
      data: products.map(product => toProductListItemResponse(product)),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getById(id: string): Promise<ProductDetailResponse> {
    const product = await this.productsRepository.findById(id);
    if (!product) throw productNotFoundException();
    return toProductDetailResponse(product);
  }
}
