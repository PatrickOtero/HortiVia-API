import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ProductCategory } from '../../../generated/prisma/enums';
import { ProductNutrientDto } from './product-nutrient.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  howToChoose?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  howToStore?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  usageTips?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductNutrientDto)
  nutrients?: ProductNutrientDto[];
}
