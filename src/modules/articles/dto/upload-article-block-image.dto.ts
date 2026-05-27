import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UploadArticleBlockImageDto {
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
