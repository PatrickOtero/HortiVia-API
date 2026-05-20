import type { ArticleWithAuthorRecord } from '../articles.repository';
import type {
  ArticleAuthorResponse,
  ArticleDetailResponse,
  ArticleListItemResponse,
} from '../types/article-response';

function toArticleAuthorResponse(
  article: ArticleWithAuthorRecord,
): ArticleAuthorResponse {
  return {
    id: article.author.id,
    name: article.author.name,
    avatarUrl: article.author.avatarUrl,
  };
}

function resolvePublishedAt(article: ArticleWithAuthorRecord) {
  return (article.publishedAt ?? article.createdAt).toISOString();
}

export function toArticleListItemResponse(
  article: ArticleWithAuthorRecord,
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
  article: ArticleWithAuthorRecord,
  readingTimeMinutes: number,
): ArticleDetailResponse {
  return {
    ...toArticleListItemResponse(article, readingTimeMinutes),
    content: article.content,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}
