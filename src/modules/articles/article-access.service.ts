import { Injectable } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { articleBlockNotFoundException, articleNotFoundException } from './utils/article-errors.util';

@Injectable()
export class ArticleAccessService {
  constructor(private readonly articlesRepository: ArticlesRepository) {}

  async requireArticle(id: string, includeUnpublished = false) {
    const article = await this.articlesRepository.findById(id, includeUnpublished);
    if (!article) {
      throw articleNotFoundException();
    }
    return article;
  }

  async requireBlock(articleId: string, blockId: string) {
    const block = await this.articlesRepository.findBlockById(blockId);
    if (!block || block.articleId !== articleId) {
      throw articleBlockNotFoundException();
    }
    return block;
  }
}
