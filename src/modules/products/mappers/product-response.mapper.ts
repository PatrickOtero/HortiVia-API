import { ProductImageKind } from '../../../generated/prisma/enums';
import type { ProductModel } from '../../../generated/prisma/models/Product';
import type { ProductDetailModel } from '../types/product-model';
import type {
  FavoriteProductItemResponse,
  ProductDetailResponse,
  ProductGuideSectionResponse,
  ProductImageResponse,
  ProductListItemResponse,
  ProductNutrientResponse,
  RelatedArticleResponse,
} from '../types/product-response';

function toProductNutrients(value: ProductModel['nutrients']): ProductNutrientResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !('label' in item) ||
      !('value' in item)
    ) {
      return [];
    }

    const label = typeof item.label === 'string' ? item.label : '';
    const nutrientValue = typeof item.value === 'string' ? item.value : '';

    if (!label || !nutrientValue) {
      return [];
    }

    return [
      {
        label,
        value: nutrientValue,
      },
    ];
  });
}

function toFallbackMainImage(product: ProductDetailModel): ProductImageResponse[] {
  if (!product.imageUrl) {
    return [];
  }

  return [
    {
      id: `${product.id}-legacy-image`,
      url: product.imageUrl,
      alt: product.name,
      caption: null,
      kind: ProductImageKind.HERO,
      sortOrder: 0,
      isPrimary: true,
    },
  ];
}

export function toProductImageResponse(
  image: Pick<
    ProductDetailModel['images'][number],
    'id' | 'url' | 'alt' | 'caption' | 'kind' | 'sortOrder' | 'isPrimary'
  >,
): ProductImageResponse {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    caption: image.caption,
    kind: image.kind,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
  };
}

function toMainImages(product: ProductDetailModel): ProductImageResponse[] {
  if (product.images.length === 0) {
    return toFallbackMainImage(product);
  }

  return product.images.map(toProductImageResponse);
}

export function toProductGuideSectionResponse(
  section: Pick<
    ProductDetailModel['guideSections'][number],
    | 'id'
    | 'kind'
    | 'title'
    | 'body'
    | 'imageUrl'
    | 'imageAlt'
    | 'imageCaption'
    | 'bullets'
    | 'idealPoints'
    | 'avoidPoints'
    | 'sortOrder'
  >,
): ProductGuideSectionResponse {
  return {
    id: section.id,
    kind: section.kind,
    title: section.title,
    body: section.body,
    imageUrl: section.imageUrl,
    imageAlt: section.imageAlt,
    imageCaption: section.imageCaption,
    bullets: [...section.bullets],
    idealPoints: [...section.idealPoints],
    avoidPoints: [...section.avoidPoints],
    sortOrder: section.sortOrder,
  };
}

function toGuideSections(
  product: ProductDetailModel,
): ProductGuideSectionResponse[] {
  return product.guideSections.map(toProductGuideSectionResponse);
}

function toRelatedArticles(
  product: ProductDetailModel,
): RelatedArticleResponse[] {
  return product.articleRelations.map(relation => ({
    id: relation.article.id,
    title: relation.article.title,
    slug: relation.article.slug,
    summary: relation.article.summary,
    category: relation.article.category,
    imageUrl: relation.article.imageUrl,
    publishedAt: (relation.article.publishedAt ?? relation.article.createdAt).toISOString(),
  }));
}

export function toProductListItemResponse(
  product: Pick<
    ProductModel,
    'id' | 'name' | 'slug' | 'category' | 'shortDescription' | 'imageUrl'
  >,
  options?: {
    isFavorite?: boolean;
  },
): ProductListItemResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    isFavorite: options?.isFavorite,
  };
}

export function toProductDetailResponse(
  product: ProductDetailModel,
): ProductDetailResponse {
  return {
    ...toProductListItemResponse(product),
    description: product.description,
    benefits: product.benefits,
    howToChoose: product.howToChoose,
    howToStore: product.howToStore,
    usageTips: product.usageTips,
    nutrients: toProductNutrients(product.nutrients),
    mainImages: toMainImages(product),
    guideSections: toGuideSections(product),
    relatedArticles: toRelatedArticles(product),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toFavoriteProductItemResponse(
  product: Pick<
    ProductModel,
    'id' | 'name' | 'slug' | 'category' | 'shortDescription' | 'imageUrl'
  >,
): FavoriteProductItemResponse {
  return {
    ...toProductListItemResponse(product, {
      isFavorite: true,
    }),
    isFavorite: true,
  };
}
