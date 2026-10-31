import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { CreateArticleBlockDto } from './dto/create-article-block.dto';
import type { CreateArticleBlockImageUploadDto } from './dto/create-article-block-image-upload.dto';
import type { CreateArticleCommentDto } from './dto/create-article-comment.dto';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import type { ListArticleCommentsQueryDto } from './dto/list-article-comments-query.dto';
import type { ListSavedArticlesQueryDto } from './dto/list-saved-articles-query.dto';
import type { ModerateArticleCommentDto } from './dto/moderate-article-comment.dto';
import type { UpdateArticleBlockDto } from './dto/update-article-block.dto';
import type { UpdateArticleBlockImageDto } from './dto/update-article-block-image.dto';
import type { UpdateArticleCommentDto } from './dto/update-article-comment.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import type { UploadArticleBlockImageDto } from './dto/upload-article-block-image.dto';
import type {
  ArticleBlockResponse,
  ArticleCommentResponse,
  ArticleCommentsListResponse,
  ArticleDetailResponse,
  ArticleReactionResponse,
  ArticlesListResponse,
  SavedArticlesListResponse,
} from './types/article-response';
import type { PresignedUploadResult } from '../storage/types/presigned-upload-result';
import type { UploadFile } from '../storage/types/upload-file';
import { ArticleQueriesService } from './article-queries.service';
import { ArticleManagementService } from './article-management.service';
import { ArticleCommentsService } from './article-comments.service';
import { ArticleEngagementService } from './article-engagement.service';
import { ArticleBlocksService } from './article-blocks.service';
import { ArticleBlockImagesService } from './article-block-images.service';
import { ArticleImagesService } from './article-images.service';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly queries: ArticleQueriesService,
    private readonly management: ArticleManagementService,
    private readonly comments: ArticleCommentsService,
    private readonly engagement: ArticleEngagementService,
    private readonly blocks: ArticleBlocksService,
    private readonly blockImages: ArticleBlockImagesService,
    private readonly images: ArticleImagesService,
  ) {}

  list(query: ListArticlesQueryDto, user?: AuthenticatedUser): Promise<ArticlesListResponse> {
    return this.queries.list(query, user);
  }

  getById(id: string, user?: AuthenticatedUser): Promise<ArticleDetailResponse> {
    return this.queries.getById(id, user);
  }

  getByIdForAdmin(id: string): Promise<ArticleDetailResponse> {
    return this.queries.getByIdForAdmin(id);
  }

  listComments(articleId: string, query: ListArticleCommentsQueryDto): Promise<ArticleCommentsListResponse> {
    return this.comments.listComments(articleId, query);
  }

  createComment(articleId: string, dto: CreateArticleCommentDto, user: AuthenticatedUser): Promise<ArticleCommentResponse> {
    return this.comments.createComment(articleId, dto, user);
  }

  updateComment(articleId: string, commentId: string, dto: UpdateArticleCommentDto, user: AuthenticatedUser): Promise<ArticleCommentResponse> {
    return this.comments.updateComment(articleId, commentId, dto, user);
  }

  deleteComment(articleId: string, commentId: string, user: AuthenticatedUser) {
    return this.comments.deleteComment(articleId, commentId, user);
  }

  moderateComment(articleId: string, commentId: string, dto: ModerateArticleCommentDto, user: AuthenticatedUser): Promise<ArticleCommentResponse> {
    return this.comments.moderateComment(articleId, commentId, dto, user);
  }

  reactToArticle(articleId: string, user: AuthenticatedUser): Promise<ArticleReactionResponse> {
    return this.engagement.reactToArticle(articleId, user);
  }

  removeReactionFromArticle(articleId: string, user: AuthenticatedUser): Promise<ArticleReactionResponse> {
    return this.engagement.removeReactionFromArticle(articleId, user);
  }

  saveArticle(userId: string, articleId: string) {
    return this.engagement.saveArticle(userId, articleId);
  }

  unsaveArticle(userId: string, articleId: string) {
    return this.engagement.unsaveArticle(userId, articleId);
  }

  listSavedArticles(userId: string, query: ListSavedArticlesQueryDto): Promise<SavedArticlesListResponse> {
    return this.engagement.listSavedArticles(userId, query);
  }

  create(dto: CreateArticleDto, user: AuthenticatedUser): Promise<ArticleDetailResponse> {
    return this.management.create(dto, user);
  }

  update(id: string, dto: UpdateArticleDto): Promise<ArticleDetailResponse> {
    return this.management.update(id, dto);
  }

  remove(id: string) {
    return this.management.remove(id);
  }

  uploadImage(id: string, file?: UploadFile): Promise<ArticleDetailResponse> {
    return this.images.uploadMainImage(id, file);
  }

  createBlock(articleId: string, dto: CreateArticleBlockDto): Promise<ArticleBlockResponse> {
    return this.blocks.createBlock(articleId, dto);
  }

  updateBlock(articleId: string, blockId: string, dto: UpdateArticleBlockDto): Promise<ArticleBlockResponse> {
    return this.blocks.updateBlock(articleId, blockId, dto);
  }

  deleteBlock(articleId: string, blockId: string) {
    return this.blocks.deleteBlock(articleId, blockId);
  }

  createBlockImageUploadUrl(articleId: string, blockId: string, dto: CreateArticleBlockImageUploadDto): Promise<PresignedUploadResult> {
    return this.blockImages.createUploadUrl(articleId, blockId, dto);
  }

  updateBlockImage(articleId: string, blockId: string, dto: UpdateArticleBlockImageDto): Promise<ArticleBlockResponse> {
    return this.blockImages.updateImage(articleId, blockId, dto);
  }

  uploadBlockImage(articleId: string, blockId: string, dto: UploadArticleBlockImageDto, file?: UploadFile): Promise<ArticleBlockResponse> {
    return this.blockImages.uploadImage(articleId, blockId, dto, file);
  }

  removeBlockImage(articleId: string, blockId: string): Promise<ArticleBlockResponse> {
    return this.blockImages.removeImage(articleId, blockId);
  }
}