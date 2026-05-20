import { IsNotEmpty, IsString } from 'class-validator';

export class ProductNutrientDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
