import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize-email';
import {
  IsStrongPasswordPolicy,
  STRONG_PASSWORD_VALIDATION_MESSAGE,
} from '../../../common/validators/password.validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty({ message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Código inválido ou expirado.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^\d{6}$/, { message: 'Código inválido ou expirado.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: STRONG_PASSWORD_VALIDATION_MESSAGE })
  @IsStrongPasswordPolicy({
    message: STRONG_PASSWORD_VALIDATION_MESSAGE,
  })
  password!: string;
}
