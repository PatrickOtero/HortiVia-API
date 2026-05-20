import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ProductCategory } from '../../../generated/prisma/enums';
import { ProductNutrientDto } from './product-nutrient.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsString()
  @IsNotEmpty()
  shortDescription!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
