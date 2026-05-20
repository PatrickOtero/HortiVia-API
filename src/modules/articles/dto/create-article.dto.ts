import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ArticleCategory } from '../../../generated/prisma/enums';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(ArticleCategory)
  category!: ArticleCategory;

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
