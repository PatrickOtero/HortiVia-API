import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ArticleBlockKind } from '../../generated/prisma/enums';
import { ArticlesRepository } from './articles.repository';
import {
  toArticleBlockItemResponse,
  toArticleDetailResponse,
  toArticleListItemResponse,
  toSavedArticleItemResponse,
} from './mappers/article-response.mapper';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { CreateArticleBlockDto } from './dto/create-article-block.dto';
import type { CreateArticleBlockImageUploadDto } from './dto/create-article-block-image-upload.dto';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import type { ListSavedArticlesQueryDto } from './dto/list-saved-articles-query.dto';
import type { UploadArticleBlockImageDto } from './dto/upload-article-block-image.dto';
import type { UpdateArticleBlockDto } from './dto/update-article-block.dto';
import type { UpdateArticleBlockImageDto } from './dto/update-article-block-image.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import type {
  ArticleBlockResponse,
  ArticleDetailResponse,
  ArticlesListResponse,
  SavedArticlesListResponse,
} from './types/article-response';
import { calculateReadingTimeMinutes } from './utils/reading-time.util';
import { slugifyProductName } from '../products/utils/slug.util';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../storage/image-upload.constants';
import type { PresignedUploadResult } from '../storage/types/presigned-upload-result';
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
          this.resolveReadingTimeMinutes(article),
          {
            isSaved: false,
          },
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
    return this.getDetailById(id, false);
  }

  async getByIdForAdmin(id: string): Promise<ArticleDetailResponse> {
    return this.getDetailById(id, true);
  }

  async uploadBlockImage(
    articleId: string,
    blockId: string,
    uploadArticleBlockImageDto: UploadArticleBlockImageDto,
    file?: UploadFile,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId, true);
    const existingBlock = await this.requireArticleBlock(articleId, blockId);
    const imageFile = this.validateImageFile(file);

    try {
      const uploadResult = await this.storageService.uploadArticleBlockImage(
        articleId,
        blockId,
        imageFile,
      );

      const updatedBlock = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: uploadResult.url,
        imageAlt: this.resolveUploadedBlockImageText(
          uploadArticleBlockImageDto.imageAlt,
          existingBlock.imageAlt,
        ),
        imageCaption: this.resolveUploadedBlockImageText(
          uploadArticleBlockImageDto.imageCaption,
          existingBlock.imageCaption,
        ),
      });

      return toArticleBlockItemResponse(updatedBlock);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleBlockNotFoundException();
      }

      throw new InternalServerErrorException({
        message: 'Nao foi possivel enviar a imagem do bloco.',
        error: 'Internal Server Error',
      });
    }
  }

  private async getDetailById(
    id: string,
    includeUnpublished: boolean,
  ): Promise<ArticleDetailResponse> {
    const article = await this.articlesRepository.findById(
      id,
      includeUnpublished,
    );

    if (!article) {
      throw this.buildArticleNotFoundException();
    }

    return toArticleDetailResponse(
      article,
      this.resolveReadingTimeMinutes(article),
      {
        isSaved: false,
      },
    );
  }

  async saveArticle(userId: string, articleId: string) {
    await this.requireArticle(articleId);

    const existingSavedArticle =
      await this.articlesRepository.findSavedArticleByUserAndArticle(
        userId,
        articleId,
      );

    if (!existingSavedArticle) {
      try {
        await this.articlesRepository.createSavedArticle(userId, articleId);
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    return {
      message: 'Artigo salvo.',
    };
  }

  async unsaveArticle(userId: string, articleId: string) {
    await this.requireArticle(articleId, true);

    const existingSavedArticle =
      await this.articlesRepository.findSavedArticleByUserAndArticle(
        userId,
        articleId,
      );

    if (existingSavedArticle) {
      try {
        await this.articlesRepository.deleteSavedArticle(userId, articleId);
      } catch (error) {
        if (!this.isRecordNotFoundError(error)) {
          throw error;
        }
      }
    }

    return {
      message: 'Artigo removido das leituras salvas.',
    };
  }

  async listSavedArticles(
    userId: string,
    query: ListSavedArticlesQueryDto,
  ): Promise<SavedArticlesListResponse> {
    const page = query.page ?? this.defaultPage;
    const limit = Math.min(query.limit ?? this.defaultLimit, this.maxLimit);

    const [savedArticles, total] = await Promise.all([
      this.articlesRepository.listSavedArticlesByUser({
        userId,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.articlesRepository.countSavedArticlesByUser(userId),
    ]);

    return {
      items: savedArticles.map(savedArticle =>
        toSavedArticleItemResponse(
          savedArticle.article,
          this.resolveReadingTimeMinutes(savedArticle.article),
        ),
      ),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
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
        subtitle: this.normalizeOptionalText(createArticleDto.subtitle),
        slug,
        summary: this.normalizeText(createArticleDto.summary),
        content: this.normalizeText(createArticleDto.content),
        category: createArticleDto.category,
        imageUrl: this.normalizeOptionalText(createArticleDto.imageUrl),
        coverImageUrl: this.normalizeOptionalText(createArticleDto.coverImageUrl),
        coverImageAlt: this.normalizeOptionalText(createArticleDto.coverImageAlt),
        readingTimeMinutes: createArticleDto.readingTimeMinutes ?? null,
        featured: createArticleDto.featured ?? false,
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
        this.resolveReadingTimeMinutes(article),
        {
          isSaved: false,
        },
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

    if (updateArticleDto.subtitle !== undefined) {
      data.subtitle = this.normalizeOptionalText(updateArticleDto.subtitle);
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

    if (updateArticleDto.coverImageUrl !== undefined) {
      data.coverImageUrl = this.normalizeOptionalText(updateArticleDto.coverImageUrl);
    }

    if (updateArticleDto.coverImageAlt !== undefined) {
      data.coverImageAlt = this.normalizeOptionalText(updateArticleDto.coverImageAlt);
    }

    if (updateArticleDto.readingTimeMinutes !== undefined) {
      data.readingTimeMinutes = updateArticleDto.readingTimeMinutes;
    }

    if (updateArticleDto.featured !== undefined) {
      data.featured = updateArticleDto.featured;
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
        this.resolveReadingTimeMinutes(existingArticle),
        {
          isSaved: false,
        },
      );
    }

    try {
      const article = await this.articlesRepository.update(id, data);

      return toArticleDetailResponse(
        article,
        this.resolveReadingTimeMinutes(article),
        {
          isSaved: false,
        },
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

  async createBlock(
    articleId: string,
    createArticleBlockDto: CreateArticleBlockDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId, true);

    const block = await this.articlesRepository.createBlock({
      article: {
        connect: {
          id: articleId,
        },
      },
      kind: createArticleBlockDto.kind,
      title: this.normalizeOptionalText(createArticleBlockDto.title),
      body: this.normalizeOptionalText(createArticleBlockDto.body),
      imageUrl: this.normalizeOptionalText(createArticleBlockDto.imageUrl),
      imageAlt: this.normalizeOptionalText(createArticleBlockDto.imageAlt),
      imageCaption: this.normalizeOptionalText(createArticleBlockDto.imageCaption),
      items: this.normalizeBlockItems(createArticleBlockDto.items),
      sortOrder: createArticleBlockDto.sortOrder ?? 0,
    });

    return toArticleBlockItemResponse(block);
  }

  async createBlockImageUploadUrl(
    articleId: string,
    blockId: string,
    createArticleBlockImageUploadDto: CreateArticleBlockImageUploadDto,
  ): Promise<PresignedUploadResult> {
    await this.requireArticle(articleId, true);
    await this.requireArticleBlock(articleId, blockId);
    this.validateImageUploadRequest(createArticleBlockImageUploadDto);

    try {
      return await this.storageService.createArticleBlockImageUploadUrl(
        articleId,
        blockId,
        createArticleBlockImageUploadDto.fileName,
        createArticleBlockImageUploadDto.contentType,
      );
    } catch {
      throw new InternalServerErrorException({
        message: 'Nao foi possivel preparar o upload da imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  async updateBlock(
    articleId: string,
    blockId: string,
    updateArticleBlockDto: UpdateArticleBlockDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId, true);
    const existingBlock = await this.requireArticleBlock(articleId, blockId);
    const data: Prisma.ArticleBlockUpdateInput = {};

    if (updateArticleBlockDto.kind !== undefined) {
      data.kind = updateArticleBlockDto.kind;
    }

    if (updateArticleBlockDto.title !== undefined) {
      data.title = this.normalizeOptionalText(updateArticleBlockDto.title);
    }

    if (updateArticleBlockDto.body !== undefined) {
      data.body = this.normalizeOptionalText(updateArticleBlockDto.body);
    }

    if (updateArticleBlockDto.imageUrl !== undefined) {
      data.imageUrl = this.normalizeOptionalText(updateArticleBlockDto.imageUrl);
    }

    if (updateArticleBlockDto.imageAlt !== undefined) {
      data.imageAlt = this.normalizeOptionalText(updateArticleBlockDto.imageAlt);
    }

    if (updateArticleBlockDto.imageCaption !== undefined) {
      data.imageCaption = this.normalizeOptionalText(updateArticleBlockDto.imageCaption);
    }

    if (updateArticleBlockDto.items !== undefined) {
      data.items = this.normalizeBlockItems(updateArticleBlockDto.items);
    }

    if (updateArticleBlockDto.sortOrder !== undefined) {
      data.sortOrder = updateArticleBlockDto.sortOrder;
    }

    if (Object.keys(data).length === 0) {
      return toArticleBlockItemResponse(existingBlock);
    }

    try {
      const block = await this.articlesRepository.updateBlock(blockId, data);
      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleBlockNotFoundException();
      }

      throw error;
    }
  }

  async updateBlockImage(
    articleId: string,
    blockId: string,
    updateArticleBlockImageDto: UpdateArticleBlockImageDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId, true);
    await this.requireArticleBlock(articleId, blockId);
    this.validateManagedBlockImageUrl(
      articleId,
      blockId,
      updateArticleBlockImageDto.imageUrl,
    );

    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: this.normalizeText(updateArticleBlockImageDto.imageUrl),
        imageAlt: this.normalizeOptionalText(updateArticleBlockImageDto.imageAlt),
        imageCaption: this.normalizeOptionalText(
          updateArticleBlockImageDto.imageCaption,
        ),
      });

      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleBlockNotFoundException();
      }

      throw error;
    }
  }

  async deleteBlock(articleId: string, blockId: string) {
    await this.requireArticle(articleId, true);
    await this.requireArticleBlock(articleId, blockId);

    try {
      await this.articlesRepository.deleteBlock(blockId);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleBlockNotFoundException();
      }

      throw error;
    }

    return {
      message: 'Bloco do artigo removido.',
    };
  }

  async removeBlockImage(
    articleId: string,
    blockId: string,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId, true);
    await this.requireArticleBlock(articleId, blockId);

    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
      });

      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleBlockNotFoundException();
      }

      throw error;
    }
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
        this.resolveReadingTimeMinutes(updatedArticle),
        {
          isSaved: false,
        },
      );
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildArticleNotFoundException();
      }

      throw new InternalServerErrorException({
        message: 'NÃƒÂ£o foi possÃƒÂ­vel enviar a imagem.',
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

  private async requireArticleBlock(articleId: string, blockId: string) {
    const block = await this.articlesRepository.findBlockById(blockId);

    if (!block || block.articleId !== articleId) {
      throw this.buildArticleBlockNotFoundException();
    }

    return block;
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

  private resolveUploadedBlockImageText(
    submittedValue: string | undefined,
    currentValue: string | null,
  ) {
    const normalizedSubmittedValue = this.normalizeOptionalText(submittedValue);

    if (normalizedSubmittedValue !== null) {
      return normalizedSubmittedValue;
    }

    return currentValue;
  }

  private normalizeTags(tags?: string[]) {
    return (tags ?? []).map(tag => tag.trim()).filter(Boolean);
  }

  private normalizeBlockItems(
    items?: unknown[],
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (items === undefined) {
      return Prisma.JsonNull;
    }

    return [...items] as Prisma.InputJsonValue;
  }

  private resolveReadingTimeMinutes(article: {
    content: string;
    readingTimeMinutes?: number | null;
    blocks?: Array<{
      kind: ArticleBlockKind;
      title: string | null;
      body: string | null;
      items: Prisma.JsonValue | null;
    }>;
  }) {
    if (article.readingTimeMinutes && article.readingTimeMinutes > 0) {
      return article.readingTimeMinutes;
    }

    const blockText = (article.blocks ?? [])
      .flatMap(block => {
        const itemsText = Array.isArray(block.items)
          ? block.items
              .map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
              .join(' ')
          : '';

        return [block.title ?? '', block.body ?? '', itemsText];
      })
      .join(' ');

    return calculateReadingTimeMinutes(
      [article.content, blockText].filter(Boolean).join(' '),
    );
  }

  private validateImageFile(file?: UploadFile): UploadFile {
    if (!file) {
      throw new BadRequestException({
        message: 'Envie uma imagem v\u00e1lida.',
        error: 'Bad Request',
      });
    }

    if (file.size > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'A imagem deve ter no m\u00e1ximo 5 MB.',
        error: 'Bad Request',
      });
    }

    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        message: 'Formato de imagem n\u00e3o permitido.',
        error: 'Bad Request',
      });
    }

    return file;
  }

  private validateImageUploadRequest(uploadRequest: {
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    const normalizedFileName = uploadRequest.fileName.trim();

    if (!normalizedFileName || normalizedFileName.includes('..') || /[\\/]/.test(normalizedFileName)) {
      throw new BadRequestException({
        message: 'Informe um nome de arquivo valido.',
        error: 'Bad Request',
      });
    }

    if (uploadRequest.fileSize > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'A imagem deve ter no maximo 5 MB.',
        error: 'Bad Request',
      });
    }

    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(uploadRequest.contentType)) {
      throw new BadRequestException({
        message: 'Formato de imagem nao permitido.',
        error: 'Bad Request',
      });
    }
  }

  private validateManagedBlockImageUrl(
    articleId: string,
    blockId: string,
    imageUrl: string,
  ) {
    const expectedPrefix = `articles/${articleId}/blocks/${blockId}`;

    if (!this.storageService.isManagedPublicUrl(imageUrl, expectedPrefix)) {
      throw new BadRequestException({
        message: 'Informe uma URL de imagem valida.',
        error: 'Bad Request',
      });
    }
  }

  private buildArticleNotFoundException() {
    return new NotFoundException({
      message: 'Artigo n\u00e3o encontrado.',
      error: 'Not Found',
    });
  }

  private buildArticleBlockNotFoundException() {
    return new NotFoundException({
      message: 'Bloco do artigo n\u00e3o encontrado.',
      error: 'Not Found',
    });
  }

  private buildSlugConflictException() {
    return new ConflictException({
      message: 'N\u00e3o foi poss\u00edvel salvar o artigo com um slug \u00fanico.',
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
