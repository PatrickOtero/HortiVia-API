import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ProductGuideSectionKind } from '../../../generated/prisma/enums';

export class CreateProductGuideSectionDto {
  @IsEnum(ProductGuideSectionKind)
  kind!: ProductGuideSectionKind;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

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
  @IsString({ each: true })
  bullets?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  idealPoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidPoints?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
