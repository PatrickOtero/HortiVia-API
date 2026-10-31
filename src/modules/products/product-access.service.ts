import { Injectable } from '@nestjs/common';
import { ArticlesRepository } from '../articles/articles.repository';
import { ProductsRepository } from './products.repository';
import {
  articleNotFoundForProductException,
  productGuideSectionNotFoundException,
  productImageNotFoundException,
  productNotFoundException,
} from './utils/product-errors.util';

@Injectable()
export class ProductAccessService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly articlesRepository: ArticlesRepository,
  ) {}

  async requireActiveProduct(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) throw productNotFoundException();
    return product;
  }

  async requireArticle(id: string) {
    const article = await this.articlesRepository.findById(id, true);
    if (!article) throw articleNotFoundForProductException();
    return article;
  }

  async requireProductImage(productId: string, imageId: string) {
    const image = await this.productsRepository.findProductImageById(imageId);
    if (!image || image.productId !== productId) {
      throw productImageNotFoundException();
    }
    return image;
  }

  async requireGuideSection(productId: string, sectionId: string) {
    const section = await this.productsRepository.findProductGuideSectionById(sectionId);
    if (!section || section.productId !== productId) {
      throw productGuideSectionNotFoundException();
    }
    return section;
  }
}
