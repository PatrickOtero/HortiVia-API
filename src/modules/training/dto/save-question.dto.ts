import { Transform } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsInt,
  IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// PATCH intentionally accepts the complete form, preventing partial option/key updates.
export class SaveQuestionDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  prompt!: string;

  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.trim() : item) : value)
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(4)
  @ArrayUnique((option: string) => typeof option === 'string' ? option.toLocaleLowerCase('pt-BR') : option)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(300, { each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctOptionIndex!: number;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  explanation!: string;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
    typeof obj[key] === 'string' ? (obj[key] as string).trim() : obj[key])
  @ValidateIf((question: SaveQuestionDto, value: unknown) =>
    question.isPublished === true || (value !== undefined && value !== null && value !== ''))
  @IsString()
  @MinLength(1, { message: 'Informe uma referência no guia para publicar a pergunta.' })
  @MaxLength(2000)
  sourceReference?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder!: number;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsBoolean()
  isPublished!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
