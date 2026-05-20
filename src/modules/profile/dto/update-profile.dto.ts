import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Gender } from '../../../generated/prisma/enums';

export class UpdateProfileDto {
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
