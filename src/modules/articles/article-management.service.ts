import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import { ArticleSlugService } from './article-slug.service';
import { toArticleDetailResponse } from './mappers/article-response.mapper';
import type { ArticleDetailResponse } from './types/article-response';
import {
  normalizeArticleTags,
  normalizeArticleText,
  normalizeOptionalArticleText,
  resolveArticleReadingTime,
} from './utils/article-content.util';
import { publicationForCreate, publicationForUpdate } from './utils/article-publication.util';
import {
  articleNotFoundException,
  articleSlugConflictException,
  isPrismaErrorCode,
} from './utils/article-errors.util';

@Injectable()
export class ArticleManagementService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
    private readonly articleSlugService: ArticleSlugService,
  ) {}

  async create(
    dto: CreateArticleDto,
    user: AuthenticatedUser,
  ): Promise<ArticleDetailResponse> {
    const slug = await this.articleSlugService.generateUniqueSlug(dto.title);
    const publication = publicationForCreate(dto);
    try {
      const article = await this.articlesRepository.create({
        title: normalizeArticleText(dto.title),
        subtitle: normalizeOptionalArticleText(dto.subtitle),
        slug,
        summary: normalizeArticleText(dto.summary),
        content: normalizeArticleText(dto.content),
        category: dto.category,
        imageUrl: normalizeOptionalArticleText(dto.imageUrl),
        coverImageUrl: normalizeOptionalArticleText(dto.coverImageUrl),
        coverImageAlt: normalizeOptionalArticleText(dto.coverImageAlt),
        readingTimeMinutes: dto.readingTimeMinutes ?? null,
        featured: dto.featured ?? false,
        tags: normalizeArticleTags(dto.tags),
        isPublished: publication.isPublished,
        publishedAt: publication.publishedAt,
        author: { connect: { id: user.userId } },
      });
      return this.toDetailResponse(article);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) throw articleSlugConflictException();
      throw error;
    }
  }

  async update(id: string, dto: UpdateArticleDto): Promise<ArticleDetailResponse> {
    const existing = await this.articleAccessService.requireArticle(id, true);
    const data: Prisma.ArticleUpdateInput = {};

    if (dto.title !== undefined) {
      const title = normalizeArticleText(dto.title);
      data.title = title;
      if (title !== existing.title) {
        data.slug = await this.articleSlugService.generateUniqueSlug(title, existing.id);
      }
    }
    if (dto.summary !== undefined) data.summary = normalizeArticleText(dto.summary);
    if (dto.subtitle !== undefined) data.subtitle = normalizeOptionalArticleText(dto.subtitle);
    if (dto.content !== undefined) data.content = normalizeArticleText(dto.content);
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.imageUrl !== undefined) data.imageUrl = normalizeOptionalArticleText(dto.imageUrl);
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = normalizeOptionalArticleText(dto.coverImageUrl);
    if (dto.coverImageAlt !== undefined) data.coverImageAlt = normalizeOptionalArticleText(dto.coverImageAlt);
    if (dto.readingTimeMinutes !== undefined) data.readingTimeMinutes = dto.readingTimeMinutes;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.tags !== undefined) data.tags = normalizeArticleTags(dto.tags);

    const publication = publicationForUpdate(existing, dto);
    if (publication) {
      data.isPublished = publication.isPublished;
      data.publishedAt = publication.publishedAt;
    }

    if (Object.keys(data).length === 0) return this.toDetailResponse(existing);

    try {
      return this.toDetailResponse(await this.articlesRepository.update(id, data));
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) throw articleNotFoundException();
      if (isPrismaErrorCode(error, 'P2002')) throw articleSlugConflictException();
      throw error;
    }
  }

  async remove(id: string) {
    await this.articleAccessService.requireArticle(id, true);
    try {
      await this.articlesRepository.unpublish(id);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) throw articleNotFoundException();
      throw error;
    }
    return { message: 'Artigo removido.' };
  }

  private toDetailResponse(article: Parameters<typeof toArticleDetailResponse>[0]) {
    return toArticleDetailResponse(article, resolveArticleReadingTime(article), {
      isSaved: false,
      isReacted: false,
      reactionsCount: article._count.reactions,
      commentsCount: article._count.comments,
    });
  }
}