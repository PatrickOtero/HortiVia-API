import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProductArticleRelationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
