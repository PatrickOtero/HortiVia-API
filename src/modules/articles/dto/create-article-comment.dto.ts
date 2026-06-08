import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateArticleCommentDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'O comentario deve ter entre 2 e 1000 caracteres.' })
  @MaxLength(1000, { message: 'O comentario deve ter entre 2 e 1000 caracteres.' })
  body!: string;
}
