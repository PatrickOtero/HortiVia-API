import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function transformNumber(value: unknown) {
  const normalizedValue = normalizeOptionalString(value);

  if (normalizedValue === undefined) {
    return undefined;
  }

  return Number(normalizedValue);
}

export class ListSavedArticlesQueryDto {
  @IsOptional()
  @Transform(({ value }) => transformNumber(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => transformNumber(value))
  @IsInt()
  @Min(1)
  limit?: number;
}
