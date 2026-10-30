import type {
  ArticleBlockKind,
  ArticleCategory,
  ArticleCommentStatus,
} from '../../../generated/prisma/enums';

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
  subtitle: string | null;
  summary: string;
  category: ArticleCategory;
  imageUrl: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  tags: string[];
  publishedAt: string;
  readingTimeMinutes: number;
  featured: boolean;
  author: ArticleAuthorResponse;
  reactionsCount: number;
  commentsCount: number;
  isReacted: boolean;
  isSaved?: boolean;
}

export interface ArticleReactionResponse {
  message: string;
  isReacted: boolean;
  reactionsCount: number;
}

export interface ArticleBlockResponse {
  id: string;
  articleId: string;
  kind: ArticleBlockKind;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCaption: string | null;
  items: unknown[] | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleCommentAuthorResponse {
  id: string;
  name: string;
}

export interface ArticleCommentResponse {
  id: string;
  body: string;
  status: ArticleCommentStatus;
  createdAt: string;
  updatedAt: string;
  author: ArticleCommentAuthorResponse;
}

export interface ArticleCommentListItemResponse {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: ArticleCommentAuthorResponse;
}

export interface ArticleDetailResponse extends ArticleListItemResponse {
  content: string;
  blocks: ArticleBlockResponse[];
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

export interface ArticleCommentsListResponse {
  items: ArticleCommentListItemResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
