import type {
  ArticleCommentRecord,
  ArticleBlockRecord,
  ArticleDetailRecord,
  ArticleListRecord,
} from '../articles.repository';
import type {
  ArticleAuthorResponse,
  ArticleBlockResponse,
  ArticleCommentAuthorResponse,
  ArticleCommentListItemResponse,
  ArticleCommentResponse,
  ArticleDetailResponse,
  ArticleListItemResponse,
  RelatedProductResponse,
  SavedArticleItemResponse,
} from '../types/article-response';

function toArticleAuthorResponse(
  article: ArticleListRecord | ArticleDetailRecord,
): ArticleAuthorResponse {
  return {
    id: article.author.id,
    name: article.author.name,
    avatarUrl: article.author.avatarUrl,
  };
}

function toArticleCommentAuthorResponse(
  comment: ArticleCommentRecord,
): ArticleCommentAuthorResponse {
  return {
    id: comment.user.id,
    name: comment.user.name,
  };
}

function resolvePublishedAt(article: ArticleListRecord | ArticleDetailRecord) {
  return (article.publishedAt ?? article.createdAt).toISOString();
}

function toResolvedImageUrl(article: ArticleListRecord | ArticleDetailRecord) {
  return article.coverImageUrl ?? article.imageUrl;
}

function toRelatedProducts(
  article: ArticleDetailRecord,
): RelatedProductResponse[] {
  return article.productRelations.map(relation => ({
    id: relation.product.id,
    name: relation.product.name,
    slug: relation.product.slug,
    category: relation.product.category,
    shortDescription: relation.product.shortDescription,
    imageUrl: relation.product.imageUrl,
  }));
}

function toArticleBlockResponse(block: ArticleBlockRecord): ArticleBlockResponse {
  return {
    id: block.id,
    articleId: block.articleId,
    kind: block.kind,
    title: block.title,
    body: block.body,
    imageUrl: block.imageUrl,
    imageAlt: block.imageAlt,
    imageCaption: block.imageCaption,
    items: Array.isArray(block.items) ? (block.items as unknown[]) : null,
    sortOrder: block.sortOrder,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
  };
}

export function toArticleListItemResponse(
  article: ArticleListRecord | ArticleDetailRecord,
  readingTimeMinutes: number,
  options?: {
    isSaved?: boolean;
    isReacted?: boolean;
    reactionsCount?: number;
    commentsCount?: number;
  },
): ArticleListItemResponse {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    subtitle: article.subtitle,
    summary: article.summary,
    category: article.category,
    imageUrl: toResolvedImageUrl(article),
    coverImageUrl: article.coverImageUrl,
    coverImageAlt: article.coverImageAlt,
    tags: article.tags,
    publishedAt: resolvePublishedAt(article),
    readingTimeMinutes,
    featured: article.featured,
    author: toArticleAuthorResponse(article),
    reactionsCount: options?.reactionsCount ?? article._count.reactions,
    commentsCount: options?.commentsCount ?? article._count.comments,
    isReacted: options?.isReacted ?? false,
    isSaved: options?.isSaved,
  };
}

export function toArticleDetailResponse(
  article: ArticleDetailRecord,
  readingTimeMinutes: number,
  options?: {
    isSaved?: boolean;
    isReacted?: boolean;
    reactionsCount?: number;
    commentsCount?: number;
  },
): ArticleDetailResponse {
  return {
    ...toArticleListItemResponse(article, readingTimeMinutes, options),
    content: article.content,
    blocks: [...article.blocks]
      .sort((leftBlock, rightBlock) => leftBlock.sortOrder - rightBlock.sortOrder)
      .map(toArticleBlockResponse),
    relatedProducts: toRelatedProducts(article),
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export function toArticleBlockItemResponse(
  block: ArticleBlockRecord,
): ArticleBlockResponse {
  return toArticleBlockResponse(block);
}

export function toSavedArticleItemResponse(
  article: ArticleListRecord | ArticleDetailRecord,
  readingTimeMinutes: number,
  options?: {
    isReacted?: boolean;
    reactionsCount?: number;
    commentsCount?: number;
  },
): SavedArticleItemResponse {
  return {
    ...toArticleListItemResponse(article, readingTimeMinutes, {
      isSaved: true,
      isReacted: options?.isReacted,
      reactionsCount: options?.reactionsCount,
      commentsCount: options?.commentsCount,
    }),
    isSaved: true,
  };
}

export function toArticleCommentResponse(
  comment: ArticleCommentRecord,
): ArticleCommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: toArticleCommentAuthorResponse(comment),
  };
}

export function toArticleCommentListItemResponse(
  comment: ArticleCommentRecord,
): ArticleCommentListItemResponse {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: toArticleCommentAuthorResponse(comment),
  };
}
