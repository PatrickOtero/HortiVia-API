import { Injectable } from '@nestjs/common';
import type { UpdateProductArticleRelationDto } from './dto/update-product-article-relation.dto';
import { ProductsRepository } from './products.repository';
import { ProductAccessService } from './product-access.service';
import { productArticleRelationNotFoundException } from './utils/product-errors.util';

@Injectable()
export class ProductArticleRelationsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
  ) {}

  async relate(productId: string, articleId: string) {
    await Promise.all([
      this.productAccessService.requireActiveProduct(productId),
      this.productAccessService.requireArticle(articleId),
    ]);
    await this.productsRepository.upsertProductArticleRelation(productId, articleId);
    return { message: 'Rela\u00e7\u00e3o salva com sucesso.' };
  }

  async update(
    productId: string,
    articleId: string,
    dto: UpdateProductArticleRelationDto,
  ) {
    await Promise.all([
      this.productAccessService.requireActiveProduct(productId),
      this.productAccessService.requireArticle(articleId),
    ]);
    const relation = await this.productsRepository.findProductArticleRelation(productId, articleId);
    if (!relation) throw productArticleRelationNotFoundException();
    if (dto.sortOrder !== undefined) {
      await this.productsRepository.updateProductArticleRelation(productId, articleId, {
        sortOrder: dto.sortOrder,
      });
    }
    return { message: 'Rela\u00e7\u00e3o atualizada com sucesso.' };
  }

  async remove(productId: string, articleId: string) {
    await Promise.all([
      this.productAccessService.requireActiveProduct(productId),
      this.productAccessService.requireArticle(articleId),
    ]);
    await this.productsRepository.deleteProductArticleRelation(productId, articleId);
    return { message: 'Rela\u00e7\u00e3o removida com sucesso.' };
  }
}
