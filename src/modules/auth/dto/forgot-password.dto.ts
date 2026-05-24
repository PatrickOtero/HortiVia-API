import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize-email';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty({ message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;
}
