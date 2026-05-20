import type { ArticleCategory } from '../../../generated/prisma/enums';

export interface ArticleAuthorResponse {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ArticleListItemResponse {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: ArticleCategory;
  imageUrl: string | null;
  tags: string[];
  publishedAt: string;
  readingTimeMinutes: number;
  author: ArticleAuthorResponse;
}

export interface ArticleDetailResponse extends ArticleListItemResponse {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticlesListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ArticlesListResponse {
  data: ArticleListItemResponse[];
  meta: ArticlesListMeta;
}
