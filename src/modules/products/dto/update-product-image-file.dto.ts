import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductImageKind } from '../../../generated/prisma/enums';

function transformBooleanValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return value;
}

function transformNumberValue(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return Number(normalizedValue);
}

export class UpdateProductImageFileDto {
  @IsOptional()
  @IsEnum(ProductImageKind)
  kind?: ProductImageKind;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @Transform(({ value }) => transformNumberValue(value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Transform(({ value }) => transformBooleanValue(value))
  @IsBoolean()
  isPrimary?: boolean;
}
