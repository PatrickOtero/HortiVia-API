import type {
  ArticleDetailRecord,
  ArticleListRecord,
} from '../articles.repository';
import type {
  ArticleAuthorResponse,
  ArticleDetailResponse,
  ArticleListItemResponse,
  RelatedProductResponse,
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

export function toArticleListItemResponse(
  article: ArticleListRecord | ArticleDetailRecord,
  readingTimeMinutes: number,
): ArticleListItemResponse {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    category: article.category,
    imageUrl: article.imageUrl,
    tags: article.tags,
    publishedAt: resolvePublishedAt(article),
    readingTimeMinutes,
    author: toArticleAuthorResponse(article),
  };
}

export function toArticleDetailResponse(
  article: ArticleDetailRecord,
  readingTimeMinutes: number,
): ArticleDetailResponse {
  return {
    ...toArticleListItemResponse(article, readingTimeMinutes),
    content: article.content,
    relatedProducts: toRelatedProducts(article),
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}
