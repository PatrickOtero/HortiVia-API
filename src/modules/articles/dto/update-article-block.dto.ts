import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ArticleBlockKind } from '../../../generated/prisma/enums';

export class UpdateArticleBlockDto {
  @IsOptional()
  @IsEnum(ArticleBlockKind)
  kind?: ArticleBlockKind;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;

  @IsOptional()
  @IsString()
  imageCaption?: string;

  @IsOptional()
  @IsArray()
  items?: unknown[];

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
