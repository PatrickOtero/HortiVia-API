import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize-email';
import {
  IsStrongPasswordPolicy,
  STRONG_PASSWORD_VALIDATION_MESSAGE,
} from '../../../common/validators/password.validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  @MinLength(2, { message: 'O nome deve ter entre 2 e 80 caracteres.' })
  @MaxLength(80, { message: 'O nome deve ter entre 2 e 80 caracteres.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail v\u00e1lido.' })
  @IsNotEmpty({ message: 'Informe um e-mail v\u00e1lido.' })
  @MaxLength(254, { message: 'Informe um e-mail v\u00e1lido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty({ message: STRONG_PASSWORD_VALIDATION_MESSAGE })
  @IsStrongPasswordPolicy({
    message: STRONG_PASSWORD_VALIDATION_MESSAGE,
  })
  password!: string;
}
