import type { ArticleCategory } from '../../../generated/prisma/enums';

import type { ProductCategory } from '../../../generated/prisma/enums';

export interface ArticleAuthorResponse {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface RelatedProductResponse {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  shortDescription: string;
  imageUrl: string | null;
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
  isSaved?: boolean;
}

export interface ArticleDetailResponse extends ArticleListItemResponse {
  content: string;
  relatedProducts: RelatedProductResponse[];
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

export interface SavedArticleItemResponse extends ArticleListItemResponse {
  isSaved: true;
}

export interface SavedArticlesListResponse {
  items: SavedArticleItemResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
