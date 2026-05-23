import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function transformBoolean(value: unknown) {
  const normalizedValue = normalizeOptionalString(value);

  if (normalizedValue === undefined) {
    return undefined;
  }

  if (typeof normalizedValue === 'boolean') {
    return normalizedValue;
  }

  if (typeof normalizedValue === 'string') {
    const lowerCasedValue = normalizedValue.toLowerCase();

    if (lowerCasedValue === 'true') {
      return true;
    }

    if (lowerCasedValue === 'false') {
      return false;
    }
  }

  return normalizedValue;
}

function transformNumber(value: unknown) {
  const normalizedValue = normalizeOptionalString(value);

  if (normalizedValue === undefined) {
    return undefined;
  }

  return Number(normalizedValue);
}

export class ListUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  emailVerified?: boolean;

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
