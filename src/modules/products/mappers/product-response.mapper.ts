import type { ProductModel } from '../../../generated/prisma/models/Product';
import type {
  ProductDetailResponse,
  ProductListItemResponse,
  ProductNutrientResponse,
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

export function toProductListItemResponse(
  product: ProductModel,
): ProductListItemResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
  };
}

export function toProductDetailResponse(
  product: ProductModel,
): ProductDetailResponse {
  return {
    ...toProductListItemResponse(product),
    description: product.description,
    benefits: product.benefits,
    howToChoose: product.howToChoose,
    howToStore: product.howToStore,
    usageTips: product.usageTips,
    nutrients: toProductNutrients(product.nutrients),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
