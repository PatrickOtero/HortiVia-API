import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize-email';
import { Gender, UserRole } from '../../../generated/prisma/enums';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O nome deve ter entre 2 e 80 caracteres.' })
  @MaxLength(80, { message: 'O nome deve ter entre 2 e 80 caracteres.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail valido.' })
  @MaxLength(254, { message: 'Informe um e-mail valido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();

      if (normalizedValue === 'true') {
        return true;
      }

      if (normalizedValue === 'false') {
        return false;
      }
    }

    return value;
  })
  @IsBoolean()
  emailVerified?: boolean;
}
