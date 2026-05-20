import type { ProductCategory } from '../../../generated/prisma/enums';

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
}

export interface ProductDetailResponse extends ProductListItemResponse {
  description: string | null;
  benefits: string[];
  howToChoose: string[];
  howToStore: string[];
  usageTips: string[];
  nutrients: ProductNutrientResponse[];
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
