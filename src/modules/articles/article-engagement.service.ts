import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleReactionType } from '../../generated/prisma/enums';
import { ArticlesRepository } from './articles.repository';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { ArticleReactionResponse } from './types/article-response';

@Injectable()
export class ArticleEngagementService {
  constructor(private readonly articlesRepository: ArticlesRepository) {}

  async reactToArticle(articleId: string, user: AuthenticatedUser): Promise<ArticleReactionResponse> {
    await this.requireArticle(articleId, user.role === 'ADMIN');
    const existingReaction = await this.articlesRepository.findReaction(
      user.userId,
      articleId,
      ArticleReactionType.HELPFUL,
    );

    if (!existingReaction) {
      try {
        await this.articlesRepository.createReaction(
          user.userId,
          articleId,
          ArticleReactionType.HELPFUL,
        );
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
      }
    }

    return {
      message: 'Marcado como útil.',
      isReacted: true,
      reactionsCount: await this.articlesRepository.countReactions(
        articleId,
        ArticleReactionType.HELPFUL,
      ),
    };
  }

  async removeReactionFromArticle(
    articleId: string,
    user: AuthenticatedUser,
  ): Promise<ArticleReactionResponse> {
    await this.requireArticle(articleId, user.role === 'ADMIN');
    const existingReaction = await this.articlesRepository.findReaction(
      user.userId,
      articleId,
      ArticleReactionType.HELPFUL,
    );

    if (existingReaction) {
      try {
        await this.articlesRepository.deleteReaction(
          user.userId,
          articleId,
          ArticleReactionType.HELPFUL,
        );
      } catch (error) {
        if (!this.isRecordNotFoundError(error)) throw error;
      }
    }

    return {
      message: 'Reação removida.',
      isReacted: false,
      reactionsCount: await this.articlesRepository.countReactions(
        articleId,
        ArticleReactionType.HELPFUL,
      ),
    };
  }

  async saveArticle(userId: string, articleId: string) {
    await this.requireArticle(articleId);
    const existing = await this.articlesRepository.findSavedArticleByUserAndArticle(userId, articleId);
    if (!existing) {
      try {
        await this.articlesRepository.createSavedArticle(userId, articleId);
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
      }
    }
    return { message: 'Artigo salvo.' };
  }

  async unsaveArticle(userId: string, articleId: string) {
    await this.requireArticle(articleId, true);
    const existing = await this.articlesRepository.findSavedArticleByUserAndArticle(userId, articleId);
    if (existing) {
      try {
        await this.articlesRepository.deleteSavedArticle(userId, articleId);
      } catch (error) {
        if (!this.isRecordNotFoundError(error)) throw error;
      }
    }
    return { message: 'Artigo removido das leituras salvas.' };
  }

  private async requireArticle(articleId: string, includeUnpublished = false) {
    const article = await this.articlesRepository.findById(articleId, includeUnpublished);
    if (!article) {
      throw new NotFoundException({ message: 'Artigo não encontrado.', error: 'Not Found' });
    }
    return article;
  }

  private isUniqueConstraintError(error: unknown) {
    return !!error && typeof error === 'object' && 'code' in error &&
      (error as { code?: string }).code === 'P2002';
  }

  private isRecordNotFoundError(error: unknown) {
    return !!error && typeof error === 'object' && 'code' in error &&
      (error as { code?: string }).code === 'P2025';
  }
}
