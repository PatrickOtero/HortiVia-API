import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { Gender } from '../../../generated/prisma/enums';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  store?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsOptional()
  @IsString()
  @Matches(/^[+()\d .-]{7,25}$/, { message: 'Informe um telefone válido.' })
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() || null : value)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'Informe a UF com duas letras.' })
  state?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
