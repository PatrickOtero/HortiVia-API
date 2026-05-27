import type {
  ArticleBlockRecord,
  ArticleDetailRecord,
  ArticleListRecord,
} from '../articles.repository';
import type {
  ArticleAuthorResponse,
  ArticleBlockResponse,
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
    isSaved: options?.isSaved,
  };
}

export function toArticleDetailResponse(
  article: ArticleDetailRecord,
  readingTimeMinutes: number,
  options?: {
    isSaved?: boolean;
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
): SavedArticleItemResponse {
  return {
    ...toArticleListItemResponse(article, readingTimeMinutes, {
      isSaved: true,
    }),
    isSaved: true,
  };
}
