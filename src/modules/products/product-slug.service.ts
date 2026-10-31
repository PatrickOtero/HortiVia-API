import { Injectable } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { slugifyProductName } from './utils/slug.util';

@Injectable()
export class ProductSlugService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async generateUnique(name: string, currentProductId?: string) {
    const baseSlug = slugifyProductName(name) || 'produto';
    let candidate = baseSlug;
    let suffix = 2;
    let existingProduct = await this.productsRepository.findBySlug(candidate);

    while (existingProduct && existingProduct.id !== currentProductId) {
      candidate = `${baseSlug}-${suffix}`;
      existingProduct = await this.productsRepository.findBySlug(candidate);
      suffix += 1;
    }

    return candidate;
  }
}
