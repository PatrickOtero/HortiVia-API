import { Injectable } from '@nestjs/common';
import { ArticleReactionType } from '../../generated/prisma/enums';
import { createPaginationMeta, resolvePagination } from '../../common/pagination/pagination';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { ListSavedArticlesQueryDto } from './dto/list-saved-articles-query.dto';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import { toSavedArticleItemResponse } from './mappers/article-response.mapper';
import type { ArticleReactionResponse, SavedArticlesListResponse } from './types/article-response';
import { isPrismaErrorCode } from './utils/article-errors.util';
import { resolveArticleReadingTime } from './utils/article-content.util';

@Injectable()
export class ArticleEngagementService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
  ) {}

  async reactToArticle(articleId: string, user: AuthenticatedUser): Promise<ArticleReactionResponse> {
    await this.articleAccessService.requireArticle(articleId, user.role === 'ADMIN');
    const existing = await this.articlesRepository.findReaction(
      user.userId,
      articleId,
      ArticleReactionType.HELPFUL,
    );

    if (!existing) {
      try {
        await this.articlesRepository.createReaction(
          user.userId,
          articleId,
          ArticleReactionType.HELPFUL,
        );
      } catch (error) {
        if (!isPrismaErrorCode(error, 'P2002')) throw error;
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
    await this.articleAccessService.requireArticle(articleId, user.role === 'ADMIN');
    const existing = await this.articlesRepository.findReaction(
      user.userId,
      articleId,
      ArticleReactionType.HELPFUL,
    );

    if (existing) {
      try {
        await this.articlesRepository.deleteReaction(
          user.userId,
          articleId,
          ArticleReactionType.HELPFUL,
        );
      } catch (error) {
        if (!isPrismaErrorCode(error, 'P2025')) throw error;
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
    await this.articleAccessService.requireArticle(articleId);
    const existing = await this.articlesRepository.findSavedArticleByUserAndArticle(
      userId,
      articleId,
    );

    if (!existing) {
      try {
        await this.articlesRepository.createSavedArticle(userId, articleId);
      } catch (error) {
        if (!isPrismaErrorCode(error, 'P2002')) throw error;
      }
    }
    return { message: 'Artigo salvo.' };
  }

  async unsaveArticle(userId: string, articleId: string) {
    await this.articleAccessService.requireArticle(articleId, true);
    const existing = await this.articlesRepository.findSavedArticleByUserAndArticle(
      userId,
      articleId,
    );

    if (existing) {
      try {
        await this.articlesRepository.deleteSavedArticle(userId, articleId);
      } catch (error) {
        if (!isPrismaErrorCode(error, 'P2025')) throw error;
      }
    }
    return { message: 'Artigo removido das leituras salvas.' };
  }

  async listSavedArticles(
    userId: string,
    query: ListSavedArticlesQueryDto,
  ): Promise<SavedArticlesListResponse> {
    const { page, limit, skip } = resolvePagination(query);
    const [savedArticles, total] = await Promise.all([
      this.articlesRepository.listSavedArticlesByUser({ userId, skip, take: limit }),
      this.articlesRepository.countSavedArticlesByUser(userId),
    ]);
    const reactedArticleIds = await this.getReactedArticleIds(
      userId,
      savedArticles.map(saved => saved.article.id),
    );

    return {
      items: savedArticles.map(saved =>
        toSavedArticleItemResponse(
          saved.article,
          resolveArticleReadingTime(saved.article),
          {
            isReacted: reactedArticleIds.has(saved.article.id),
            reactionsCount: saved.article._count.reactions,
            commentsCount: saved.article._count.comments,
          },
        ),
      ),
      ...createPaginationMeta(page, limit, total),
    };
  }

  private async getReactedArticleIds(userId: string, articleIds: string[]) {
    if (articleIds.length === 0) return new Set<string>();
    const ids = await this.articlesRepository.getReactionArticleIdsForUser(
      userId,
      articleIds,
      ArticleReactionType.HELPFUL,
    );
    return new Set(ids);
  }
}