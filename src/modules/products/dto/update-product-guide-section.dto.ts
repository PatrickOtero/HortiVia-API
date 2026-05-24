import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ProductGuideSectionKind } from '../../../generated/prisma/enums';

export class UpdateProductGuideSectionDto {
  @IsOptional()
  @IsEnum(ProductGuideSectionKind)
  kind?: ProductGuideSectionKind;

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
