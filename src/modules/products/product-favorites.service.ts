import { Injectable } from '@nestjs/common';
import {
  createPaginationMeta,
  resolvePagination,
} from '../../common/pagination/pagination';
import type { ListFavoriteProductsQueryDto } from './dto/list-favorite-products-query.dto';
import { toFavoriteProductItemResponse } from './mappers/product-response.mapper';
import { ProductsRepository } from './products.repository';
import { ProductAccessService } from './product-access.service';
import type { FavoriteProductsListResponse } from './types/product-response';
import { isProductPrismaError } from './utils/product-errors.util';

@Injectable()
export class ProductFavoritesService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
  ) {}

  async favoriteProduct(userId: string, productId: string) {
    await this.productAccessService.requireActiveProduct(productId);
    const existing = await this.productsRepository.findFavoriteByUserAndProduct(userId, productId);
    if (!existing) {
      try {
        await this.productsRepository.createFavorite(userId, productId);
      } catch (error) {
        if (!isProductPrismaError(error, 'P2002')) throw error;
      }
    }
    return { message: 'Produto adicionado aos favoritos.' };
  }

  async unfavoriteProduct(userId: string, productId: string) {
    await this.productAccessService.requireActiveProduct(productId);
    const existing = await this.productsRepository.findFavoriteByUserAndProduct(userId, productId);
    if (existing) {
      try {
        await this.productsRepository.deleteFavorite(userId, productId);
      } catch (error) {
        if (!isProductPrismaError(error, 'P2025')) throw error;
      }
    }
    return { message: 'Produto removido dos favoritos.' };
  }

  async listFavoriteProducts(
    userId: string,
    query: ListFavoriteProductsQueryDto,
  ): Promise<FavoriteProductsListResponse> {
    const { page, limit, skip } = resolvePagination(query);
    const [favorites, total] = await Promise.all([
      this.productsRepository.listFavoritesByUser({ userId, skip, take: limit }),
      this.productsRepository.countFavoritesByUser(userId),
    ]);
    return {
      items: favorites.map(favorite => toFavoriteProductItemResponse(favorite.product)),
      ...createPaginationMeta(page, limit, total),
    };
  }
}
