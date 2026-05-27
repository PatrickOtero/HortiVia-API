import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateArticleBlockImageUploadDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  contentType!: string;

  @IsInt()
  @Min(1)
  fileSize!: number;
}
