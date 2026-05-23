import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize-email';

export class ResendEmailConfirmationDto {
  @IsEmail({}, { message: 'Informe um e-mail v\u00e1lido.' })
  @IsNotEmpty({ message: 'Informe um e-mail v\u00e1lido.' })
  @MaxLength(254, { message: 'Informe um e-mail v\u00e1lido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;
}
