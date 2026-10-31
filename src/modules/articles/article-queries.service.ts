import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ArticleReactionType } from '../../generated/prisma/enums';
import { createPaginationMeta, resolvePagination } from '../../common/pagination/pagination';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import {
  toArticleDetailResponse,
  toArticleListItemResponse,
} from './mappers/article-response.mapper';
import type { ArticleDetailResponse, ArticlesListResponse } from './types/article-response';
import { resolveArticleReadingTime } from './utils/article-content.util';

@Injectable()
export class ArticleQueriesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
  ) {}

  async list(
    query: ListArticlesQueryDto,
    user?: AuthenticatedUser,
  ): Promise<ArticlesListResponse> {
    const { page, limit, skip } = resolvePagination(query);
    const where = this.buildListWhereInput(query);
    const [articles, total] = await Promise.all([
      this.articlesRepository.findManyWithPagination({ where, skip, take: limit }),
      this.articlesRepository.count(where),
    ]);
    const reactedArticleIds = await this.getReactedArticleIds(
      user?.userId,
      articles.map(article => article.id),
    );

    return {
      data: articles.map(article =>
        toArticleListItemResponse(article, resolveArticleReadingTime(article), {
          isSaved: false,
          isReacted: reactedArticleIds.has(article.id),
          reactionsCount: article._count.reactions,
          commentsCount: article._count.comments,
        }),
      ),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getById(id: string, user?: AuthenticatedUser): Promise<ArticleDetailResponse> {
    return this.getDetailById(id, false, user);
  }

  async getByIdForAdmin(id: string): Promise<ArticleDetailResponse> {
    return this.getDetailById(id, true);
  }

  private async getDetailById(
    id: string,
    includeUnpublished: boolean,
    user?: AuthenticatedUser,
  ): Promise<ArticleDetailResponse> {
    const article = await this.articleAccessService.requireArticle(id, includeUnpublished);
    const isReacted = user?.userId
      ? Boolean(await this.articlesRepository.findReaction(
          user.userId,
          article.id,
          ArticleReactionType.HELPFUL,
        ))
      : false;

    return toArticleDetailResponse(article, resolveArticleReadingTime(article), {
      isSaved: false,
      isReacted,
      reactionsCount: article._count.reactions,
      commentsCount: article._count.comments,
    });
  }

  private buildListWhereInput(query: ListArticlesQueryDto): Prisma.ArticleWhereInput {
    const search = query.search?.trim();
    return {
      isPublished: true,
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
  }

  private async getReactedArticleIds(userId: string | undefined, articleIds: string[]) {
    if (!userId || articleIds.length === 0) return new Set<string>();
    const ids = await this.articlesRepository.getReactionArticleIdsForUser(
      userId,
      articleIds,
      ArticleReactionType.HELPFUL,
    );
    return new Set(ids);
  }
}