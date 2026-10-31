import type { Prisma } from '../../../generated/prisma/client';
import type { ProductNutrientDto } from '../dto/product-nutrient.dto';

export function normalizeProductText(value: string) {
  return value.trim();
}

export function normalizeOptionalProductText(value?: string | null) {
  if (value === undefined || value === null) return null;
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function normalizeProductStringArray(values?: string[]) {
  return (values ?? []).map(value => value.trim()).filter(Boolean);
}

export function normalizeProductNutrients(
  nutrients?: ProductNutrientDto[],
): Prisma.InputJsonValue {
  return (nutrients ?? [])
    .map(nutrient => ({
      label: nutrient.label.trim(),
      value: nutrient.value.trim(),
    }))
    .filter(nutrient => nutrient.label && nutrient.value) as Prisma.InputJsonValue;
}
