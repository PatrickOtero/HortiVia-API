import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ArticlesRepository } from './articles.repository';
import {
  toArticleDetailResponse,
  toArticleListItemResponse,
} from './mappers/article-response.mapper';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import type {
  ArticleDetailResponse,
  ArticlesListResponse,
} from './types/article-response';
import { calculateReadingTimeMinutes } from './utils/reading-time.util';
import { slugifyProductName } from '../products/utils/slug.util';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../storage/image-upload.constants';
import type { UploadFile } from '../storage/types/upload-file';

@Injectable()
export class ArticlesService {
  private readonly defaultPage = 1;
  private readonly defaultLimit = 10;
  private readonly maxLimit = 50;

  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly storageService: StorageService,
  ) {}

  async list(query: ListArticlesQueryDto): Promise<ArticlesListResponse> {
    const page = query.page ?? this.defaultPage;
    const limit = Math.min(query.limit ?? this.defaultLimit, this.maxLimit);
    const where = this.buildListWhereInput(query);

    const [articles, total] = await Promise.all([
      this.articlesRepository.findManyWithPagination({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.articlesRepository.count(where),
    ]);

    return {
      data: articles.map(article =>
        toArticleListItemResponse(
          article,
          calculateReadingTimeMinutes(article.content),
        ),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string): Promise<ArticleDetailResponse> {
    const article = await this.articlesRepository.findById(id);

    if (!article) {
      throw this.buildArticleNotFoundException();
    }

    return toArticleDetailResponse(
      article,
      calculateReadingTimeMinutes(article.content),
    );
  }

  async create(
    createArticleDto: CreateArticleDto,
    user: AuthenticatedUser,
  ): Promise<ArticleDetailResponse> {
    const slug = await this.generateUniqueSlug(createArticleDto.title);
    const publication = this.resolvePublicationStateForCreate(createArticleDto);

    try {
      const article = await this.articlesRepository.create({
        title: this.normalizeText(createArticleDto.title),
        slug,
        summary: this.normalizeText(createArticleDto.summary),
        content: this.normalizeText(createArticleDto.content),
        category: createArticleDto.category,
        imageUrl: this.normalizeOptionalText(createArticleDto.imageUrl),
        tags: this.normalizeTags(createArticleDto.tags),
        isPublished: publication.isPublished,
        publishedAt: publication.publishedAt,
        author: {
          connect: {
            id: user.userId,
          },
        },
      });

      return toArticleDetailResponse(
        article,
        calculateReadingTimeMinutes(article.content),
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw this.buildSlugConflictException();
      }

      throw error;
    }
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleDetailResponse> {
    const existingArticle = await this.requireArticle(id, true);
    const data: Prisma.ArticleUpdateInput = {};

    if (updateArticleDto.title !== undefined) {
      const normalizedTitle = this.normalizeText(updateArticleDto.title);
      data.title = normalizedTitle;

      if (normalizedTitle !== existingArticle.title) {
        data.slug = await this.generateUniqueSlug(normalizedTitle, existingArticle.id);
      }
    }

    if (updateArticleDto.summary !== undefined) {
      data.summary = this.normalizeText(updateArticleDto.summary);
    }

    if (updateArticleDto.content !== undefined) {
      data.content = this.normalizeText(updateArticleDto.content);
    }

    if (updateArticleDto.category !== undefined) {
      data.category = updateArticleDto.category;
    }

    if (updateArticleDto.imageUrl !== undefined) {
      data.imageUrl = this.normalizeOptionalText(updateArticleDto.imageUrl);
    }

    if (updateArticleDto.tags !== undefined) {
      data.tags = this.normalizeTags(updateArticleDto.tags);
    }

    const publication = this.resolvePublicationStateForUpdate(
      existingArticle,
      updateArticleDto,
    );

    if (publication) {
      data.isPublished = publication.isPublished;
      data.publishedAt = publication.publishedAt;
    }

    if (Object.keys(data).length === 0) {
      return toArticleDetailResponse(
        existingArticle,
        calculateReadingTimeMinutes(existingArticle.content),
      );
    }

    try {
      const article = await this.articlesRepository.update(id, data);

      return toArticleDetailResponse(
        article,
        calculateReadingTimeMinutes(article.content),
      );
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleNotFoundException();
      }

      if (this.isUniqueConstraintError(error)) {
        throw this.buildSlugConflictException();
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.requireArticle(id, true);

    try {
      await this.articlesRepository.unpublish(id);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleNotFoundException();
      }

      throw error;
    }

    return {
      message: 'Artigo removido.',
    };
  }

  async uploadImage(id: string, file?: UploadFile): Promise<ArticleDetailResponse> {
    await this.requireArticle(id, true);
    const imageFile = this.validateImageFile(file);

    try {
      const uploadResult = await this.storageService.uploadArticleImage(id, imageFile);
      const updatedArticle = await this.articlesRepository.updateImageUrl(
        id,
        uploadResult.url,
      );

      return toArticleDetailResponse(
        updatedArticle,
        calculateReadingTimeMinutes(updatedArticle.content),
      );
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleNotFoundException();
      }

      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  private buildListWhereInput(query: ListArticlesQueryDto): Prisma.ArticleWhereInput {
    const trimmedSearch = query.search?.trim();

    return {
      isPublished: true,
      ...(trimmedSearch
        ? {
            OR: [
              {
                title: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
              {
                summary: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
    };
  }

  private async requireArticle(id: string, includeUnpublished = false) {
    const article = await this.articlesRepository.findById(id, includeUnpublished);

    if (!article) {
      throw this.buildArticleNotFoundException();
    }

    return article;
  }

  private async generateUniqueSlug(title: string, currentArticleId?: string) {
    const baseSlug = slugifyProductName(title);
    let candidate = baseSlug || 'artigo';
    let suffix = 2;
    let existingArticle = await this.articlesRepository.findBySlug(candidate);

    while (existingArticle && existingArticle.id !== currentArticleId) {
      candidate = `${baseSlug || 'artigo'}-${suffix}`;
      existingArticle = await this.articlesRepository.findBySlug(candidate);
      suffix += 1;
    }

    return candidate;
  }

  private resolvePublicationStateForCreate(createArticleDto: CreateArticleDto) {
    const isPublished = createArticleDto.isPublished ?? false;
    const publishedAt = this.resolvePublishedAtValue(
      isPublished,
      createArticleDto.publishedAt,
      null,
    );

    return {
      isPublished,
      publishedAt,
    };
  }

  private resolvePublicationStateForUpdate(
    existingArticle: Awaited<ReturnType<ArticlesRepository['findById']>>,
    updateArticleDto: UpdateArticleDto,
  ) {
    if (!existingArticle) {
      return null;
    }

    if (
      updateArticleDto.isPublished === undefined &&
      updateArticleDto.publishedAt === undefined
    ) {
      return null;
    }

    const isPublished = updateArticleDto.isPublished ?? existingArticle.isPublished;
    const publishedAt = this.resolvePublishedAtValue(
      isPublished,
      updateArticleDto.publishedAt,
      existingArticle.publishedAt,
    );

    return {
      isPublished,
      publishedAt,
    };
  }

  private resolvePublishedAtValue(
    isPublished: boolean,
    publishedAtValue: string | undefined,
    existingPublishedAt: Date | null,
  ) {
    if (!isPublished) {
      return null;
    }

    if (publishedAtValue) {
      return new Date(publishedAtValue);
    }

    return existingPublishedAt ?? new Date();
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeTags(tags?: string[]) {
    return (tags ?? []).map(tag => tag.trim()).filter(Boolean);
  }

  private validateImageFile(file?: UploadFile): UploadFile {
    if (!file) {
      throw new BadRequestException({
        message: 'Envie uma imagem válida.',
        error: 'Bad Request',
      });
    }

    if (file.size > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'A imagem deve ter no máximo 5 MB.',
        error: 'Bad Request',
      });
    }

    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        message: 'Formato de imagem não permitido.',
        error: 'Bad Request',
      });
    }

    return file;
  }

  private buildArticleNotFoundException() {
    return new NotFoundException({
      message: 'Artigo não encontrado.',
      error: 'Not Found',
    });
  }

  private buildSlugConflictException() {
    return new ConflictException({
      message: 'Não foi possível salvar o artigo com um slug único.',
      error: 'Conflict',
    });
  }

  private isUniqueConstraintError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === 'P2002';
  }

  private isRecordNotFoundError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === 'P2025';
  }
}
