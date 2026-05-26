import type {
  ProductCategory,
  ProductGuideSectionKind,
  ProductImageKind,
} from '../../../generated/prisma/enums';

export interface ProductNutrientResponse {
  label: string;
  value: string;
}

export interface ProductListItemResponse {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  shortDescription: string;
  imageUrl: string | null;
  isFavorite?: boolean;
}

export interface ProductImageResponse {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  kind: ProductImageKind;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductGuideSectionResponse {
  id: string;
  kind: ProductGuideSectionKind;
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCaption: string | null;
  bullets: string[];
  idealPoints: string[];
  avoidPoints: string[];
  sortOrder: number;
}

export interface ProductDetailResponse extends ProductListItemResponse {
  description: string | null;
  benefits: string[];
  howToChoose: string[];
  howToStore: string[];
  usageTips: string[];
  nutrients: ProductNutrientResponse[];
  mainImages: ProductImageResponse[];
  guideSections: ProductGuideSectionResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductsListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductsListResponse {
  data: ProductListItemResponse[];
  meta: ProductsListMeta;
}

export interface FavoriteProductItemResponse extends ProductListItemResponse {
  isFavorite: true;
}

export interface FavoriteProductsListResponse {
  items: FavoriteProductItemResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
