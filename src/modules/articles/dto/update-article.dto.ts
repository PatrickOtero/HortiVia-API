import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { ArticleCategory } from '../../../generated/prisma/enums';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
