import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateArticleBlockImageDto {
  @IsUrl()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  imageAlt?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  imageCaption?: string;
}
