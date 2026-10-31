import { Injectable } from '@nestjs/common';
import { slugifyProductName } from '../products/utils/slug.util';
import { ArticlesRepository } from './articles.repository';

@Injectable()
export class ArticleSlugService {
  constructor(private readonly articlesRepository: ArticlesRepository) {}

  async generateUniqueSlug(title: string, currentArticleId?: string) {
    const baseSlug = slugifyProductName(title);
    const base = baseSlug || 'artigo';
    let candidate = base;
    let suffix = 2;
    let existing = await this.articlesRepository.findBySlug(candidate);

    while (existing && existing.id !== currentArticleId) {
      candidate = `${base}-${suffix++}`;
      existing = await this.articlesRepository.findBySlug(candidate);
    }
    return candidate;
  }
}