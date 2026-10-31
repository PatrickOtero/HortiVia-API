import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ArticleBlockKind,
  ArticleReactionType,
} from '../../generated/prisma/enums';
import {
  createPaginationMeta,
  resolvePagination,
} from '../../common/pagination/pagination';
import { ArticlesRepository } from './articles.repository';
import {
  toArticleDetailResponse,
  toArticleListItemResponse,
  toSavedArticleItemResponse,
} from './mappers/article-response.mapper';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { CreateArticleBlockDto } from './dto/create-article-block.dto';
import type { CreateArticleBlockImageUploadDto } from './dto/create-article-block-image-upload.dto';
import type { CreateArticleCommentDto } from './dto/create-article-comment.dto';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import type { ListArticleCommentsQueryDto } from './dto/list-article-comments-query.dto';
import type { ModerateArticleCommentDto } from './dto/moderate-article-comment.dto';
import type { ListSavedArticlesQueryDto } from './dto/list-saved-articles-query.dto';
import type { UploadArticleBlockImageDto } from './dto/upload-article-block-image.dto';
import type { UpdateArticleBlockDto } from './dto/update-article-block.dto';
import type { UpdateArticleBlockImageDto } from './dto/update-article-block-image.dto';
import type { UpdateArticleCommentDto } from './dto/update-article-comment.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import type {
  ArticleBlockResponse,
  ArticleCommentResponse,
  ArticleCommentsListResponse,
  ArticleDetailResponse,
  ArticleReactionResponse,
  ArticlesListResponse,
  SavedArticlesListResponse,
} from './types/article-response';
import { calculateReadingTimeMinutes } from './utils/reading-time.util';
import { slugifyProductName } from '../products/utils/slug.util';
import { StorageService } from '../storage/storage.service';
import { ArticleCommentsService } from './article-comments.service';
import { ArticleEngagementService } from './article-engagement.service';
import { ArticleBlocksService } from './article-blocks.service';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../storage/image-upload.constants';
import type { PresignedUploadResult } from '../storage/types/presigned-upload-result';
import type { UploadFile } from '../storage/types/upload-file';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly storageService: StorageService,
    private readonly articleCommentsService: ArticleCommentsService,
    private readonly articleEngagementService: ArticleEngagementService,
    private readonly articleBlocksService: ArticleBlocksService,
  ) {}

  async list(
    query: ListArticlesQueryDto,
    user?: AuthenticatedUser,
  ): Promise<ArticlesListResponse> {
    const { page, limit, skip } = resolvePagination(query);
    const where = this.buildListWhereInput(query);

    const [articles, total] = await Promise.all([
      this.articlesRepository.findManyWithPagination({
        where,
        skip,
        take: limit,
      }),
      this.articlesRepository.count(where),
    ]);
    const reactedArticleIds = await this.getReactedArticleIds(
      user?.userId,
      articles.map(article => article.id),
    );

    return {
      data: articles.map(article =>
        toArticleListItemResponse(
          article,
          this.resolveReadingTimeMinutes(article),
          {
            isSaved: false,
            isReacted: reactedArticleIds.has(article.id),
            reactionsCount: article._count.reactions,
            commentsCount: article._count.comments,
          },
        ),
      ),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getById(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<ArticleDetailResponse> {
    return this.getDetailById(id, false, user);
  }

  async getByIdForAdmin(id: string): Promise<ArticleDetailResponse> {
    return this.getDetailById(id, true);
  }

  async listComments(
    articleId: string,
    query: ListArticleCommentsQueryDto,
  ): Promise<ArticleCommentsListResponse> {
    return this.articleCommentsService.listComments(articleId, query);
  }

  async createComment(
    articleId: string,
    createArticleCommentDto: CreateArticleCommentDto,
    user: AuthenticatedUser,
  ): Promise<ArticleCommentResponse> {
    return this.articleCommentsService.createComment(
      articleId,
      createArticleCommentDto,
      user,
    );
  }

  async updateComment(
    articleId: string,
    commentId: string,
    updateArticleCommentDto: UpdateArticleCommentDto,
    user: AuthenticatedUser,
  ): Promise<ArticleCommentResponse> {
    return this.articleCommentsService.updateComment(
      articleId,
      commentId,
      updateArticleCommentDto,
      user,
    );
  }

  async deleteComment(
    articleId: string,
    commentId: string,
    user: AuthenticatedUser,
  ) {
    return this.articleCommentsService.deleteComment(articleId, commentId, user);
  }

  async moderateComment(
    articleId: string,
    commentId: string,
    moderateArticleCommentDto: ModerateArticleCommentDto,
    user: AuthenticatedUser,
  ): Promise<ArticleCommentResponse> {
    return this.articleCommentsService.moderateComment(
      articleId,
      commentId,
      moderateArticleCommentDto,
      user,
    );
  }

  async uploadBlockImage(
    articleId: string,
    blockId: string,
    uploadArticleBlockImageDto: UploadArticleBlockImageDto,
    file?: UploadFile,
  ): Promise<ArticleBlockResponse> {
    return this.articleBlocksService.uploadBlockImage(
      articleId,
      blockId,
      uploadArticleBlockImageDto,
      file,
    );
  }

  private async getDetailById(
    id: string,
    includeUnpublished: boolean,
    user?: AuthenticatedUser,
  ): Promise<ArticleDetailResponse> {
    const article = await this.articlesRepository.findById(
      id,
      includeUnpublished,
    );

    if (!article) {
      throw this.buildArticleNotFoundException();
    }

    const isReacted = user?.userId
      ? Boolean(
          await this.articlesRepository.findReaction(
            user.userId,
            article.id,
            ArticleReactionType.HELPFUL,
          ),
        )
      : false;

    return toArticleDetailResponse(
      article,
      this.resolveReadingTimeMinutes(article),
      {
        isSaved: false,
        isReacted,
        reactionsCount: article._count.reactions,
        commentsCount: article._count.comments,
      },
    );
  }

  async reactToArticle(articleId: string, user: AuthenticatedUser): Promise<ArticleReactionResponse> {
    return this.articleEngagementService.reactToArticle(articleId, user);
  }

  async removeReactionFromArticle(articleId: string, user: AuthenticatedUser): Promise<ArticleReactionResponse> {
    return this.articleEngagementService.removeReactionFromArticle(articleId, user);
  }

  async saveArticle(userId: string, articleId: string) {
    return this.articleEngagementService.saveArticle(userId, articleId);
  }

  async unsaveArticle(userId: string, articleId: string) {
    return this.articleEngagementService.unsaveArticle(userId, articleId);
  }

  async listSavedArticles(
    userId: string,
    query: ListSavedArticlesQueryDto,
  ): Promise<SavedArticlesListResponse> {
    const { page, limit, skip } = resolvePagination(query);

    const [savedArticles, total] = await Promise.all([
      this.articlesRepository.listSavedArticlesByUser({
        userId,
        skip,
        take: limit,
      }),
      this.articlesRepository.countSavedArticlesByUser(userId),
    ]);
    const reactedArticleIds = await this.getReactedArticleIds(
      userId,
      savedArticles.map(savedArticle => savedArticle.article.id),
    );

    return {
      items: savedArticles.map(savedArticle =>
        toSavedArticleItemResponse(
          savedArticle.article,
          this.resolveReadingTimeMinutes(savedArticle.article),
          {
            isReacted: reactedArticleIds.has(savedArticle.article.id),
            reactionsCount: savedArticle.article._count.reactions,
            commentsCount: savedArticle.article._count.comments,
          },
        ),
      ),
      ...createPaginationMeta(page, limit, total),
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
          isReacted: false,
          reactionsCount: article._count.reactions,
          commentsCount: article._count.comments,
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
          isReacted: false,
          reactionsCount: existingArticle._count.reactions,
          commentsCount: existingArticle._count.comments,
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
          isReacted: false,
          reactionsCount: article._count.reactions,
          commentsCount: article._count.comments,
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

  async createBlock(articleId: string, dto: CreateArticleBlockDto): Promise<ArticleBlockResponse> {
    return this.articleBlocksService.createBlock(articleId, dto);
  }

  async createBlockImageUploadUrl(articleId: string, blockId: string, dto: CreateArticleBlockImageUploadDto): Promise<PresignedUploadResult> {
    return this.articleBlocksService.createBlockImageUploadUrl(articleId, blockId, dto);
  }

  async updateBlock(articleId: string, blockId: string, dto: UpdateArticleBlockDto): Promise<ArticleBlockResponse> {
    return this.articleBlocksService.updateBlock(articleId, blockId, dto);
  }

  async updateBlockImage(articleId: string, blockId: string, dto: UpdateArticleBlockImageDto): Promise<ArticleBlockResponse> {
    return this.articleBlocksService.updateBlockImage(articleId, blockId, dto);
  }

  async deleteBlock(articleId: string, blockId: string) {
    return this.articleBlocksService.deleteBlock(articleId, blockId);
  }

  async removeBlockImage(articleId: string, blockId: string): Promise<ArticleBlockResponse> {
    return this.articleBlocksService.removeBlockImage(articleId, blockId);
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
          isReacted: false,
          reactionsCount: updatedArticle._count.reactions,
          commentsCount: updatedArticle._count.comments,
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

  private async getReactedArticleIds(userId?: string, articleIds?: string[]) {
    if (!userId || !articleIds || articleIds.length === 0) {
      return new Set<string>();
    }

    const reactedArticleIds =
      await this.articlesRepository.getReactionArticleIdsForUser(
        userId,
        articleIds,
        ArticleReactionType.HELPFUL,
      );

    return new Set(reactedArticleIds);
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

  private buildArticleNotFoundException() {
    return new NotFoundException({
      message: 'Artigo n\u00e3o encontrado.',
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
