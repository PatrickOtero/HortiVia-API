import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticleCommentStatus } from '../../generated/prisma/enums';
import {
  createPaginationMeta,
  resolvePagination,
} from '../../common/pagination/pagination';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import type { CreateArticleCommentDto } from './dto/create-article-comment.dto';
import type { ListArticleCommentsQueryDto } from './dto/list-article-comments-query.dto';
import type { ModerateArticleCommentDto } from './dto/moderate-article-comment.dto';
import type { UpdateArticleCommentDto } from './dto/update-article-comment.dto';
import { toArticleCommentListItemResponse, toArticleCommentResponse } from './mappers/article-response.mapper';
import { ArticlesRepository } from './articles.repository';
import type { ArticleCommentResponse, ArticleCommentsListResponse } from './types/article-response';

@Injectable()
export class ArticleCommentsService {
  constructor(private readonly articlesRepository: ArticlesRepository) {}

  async listComments(
    articleId: string,
    query: ListArticleCommentsQueryDto,
  ): Promise<ArticleCommentsListResponse> {
    const { page, limit, skip } = resolvePagination(query);
    await this.requireArticle(articleId);

    const [comments, total] = await Promise.all([
      this.articlesRepository.listVisibleCommentsByArticle({ articleId, skip, take: limit }),
      this.articlesRepository.countVisibleCommentsByArticle(articleId),
    ]);

    return {
      items: comments.map(toArticleCommentListItemResponse),
      ...createPaginationMeta(page, limit, total),
    };
  }

  async createComment(
    articleId: string,
    dto: CreateArticleCommentDto,
    user: AuthenticatedUser,
  ): Promise<ArticleCommentResponse> {
    await this.requireArticle(articleId);
    const comment = await this.articlesRepository.createComment(
      articleId,
      user.userId,
      dto.body,
    );
    return toArticleCommentResponse(comment);
  }

  async updateComment(
    articleId: string,
    commentId: string,
    dto: UpdateArticleCommentDto,
    user: AuthenticatedUser,
  ): Promise<ArticleCommentResponse> {
    await this.requireArticle(articleId, user.role === 'ADMIN');
    const comment = await this.requireComment(articleId, commentId);

    if (comment.userId !== user.userId) {
      throw this.buildCommentOwnerForbiddenException();
    }
    if (comment.status === ArticleCommentStatus.DELETED) {
      throw this.buildCommentNotFoundException();
    }
    if (comment.status !== ArticleCommentStatus.VISIBLE) {
      throw this.buildCommentEditForbiddenException();
    }

    return toArticleCommentResponse(
      await this.articlesRepository.updateComment(commentId, { body: dto.body }),
    );
  }

  async deleteComment(articleId: string, commentId: string, user: AuthenticatedUser) {
    await this.requireArticle(articleId, user.role === 'ADMIN');
    const comment = await this.requireComment(articleId, commentId);

    if (user.role !== 'ADMIN' && comment.userId !== user.userId) {
      throw this.buildCommentOwnerForbiddenException();
    }
    if (comment.status !== ArticleCommentStatus.DELETED) {
      await this.articlesRepository.updateComment(commentId, {
        status: ArticleCommentStatus.DELETED,
        deletedAt: new Date(),
      });
    }
    return { message: 'Comentario removido.' };
  }

  async moderateComment(
    articleId: string,
    commentId: string,
    dto: ModerateArticleCommentDto,
    user: AuthenticatedUser,
  ): Promise<ArticleCommentResponse> {
    await this.requireArticle(articleId, true);
    const comment = await this.requireComment(articleId, commentId);
    if (comment.status === ArticleCommentStatus.DELETED) {
      throw this.buildCommentNotFoundException();
    }

    const updatedComment = await this.articlesRepository.updateComment(commentId, {
      status: dto.status,
      moderatedAt: new Date(),
      moderatedBy: { connect: { id: user.userId } },
    });
    return toArticleCommentResponse(updatedComment);
  }

  private async requireArticle(articleId: string, includeUnpublished = false) {
    const article = await this.articlesRepository.findById(articleId, includeUnpublished);
    if (!article) {
      throw new NotFoundException({ message: 'Artigo não encontrado.', error: 'Not Found' });
    }
    return article;
  }

  private async requireComment(articleId: string, commentId: string) {
    const comment = await this.articlesRepository.findCommentById(commentId);
    if (!comment || comment.articleId !== articleId) {
      throw this.buildCommentNotFoundException();
    }
    return comment;
  }

  private buildCommentNotFoundException() {
    return new NotFoundException({ message: 'Comentario nao encontrado.', error: 'Not Found' });
  }

  private buildCommentOwnerForbiddenException() {
    return new ForbiddenException({ message: 'Voce nao pode gerenciar este comentario.', error: 'Forbidden' });
  }

  private buildCommentEditForbiddenException() {
    return new ForbiddenException({ message: 'Este comentario nao pode mais ser editado.', error: 'Forbidden' });
  }
}
