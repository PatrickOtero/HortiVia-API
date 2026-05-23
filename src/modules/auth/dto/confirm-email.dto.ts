import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { normalizeEmail } from '../../../common/utils/normalize-email';

export class ConfirmEmailDto {
  @IsEmail({}, { message: 'Informe um e-mail v\u00e1lido.' })
  @IsNotEmpty({ message: 'Informe um e-mail v\u00e1lido.' })
  @MaxLength(254, { message: 'Informe um e-mail v\u00e1lido.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'C\u00f3digo inv\u00e1lido ou expirado.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^\d{6}$/, { message: 'C\u00f3digo inv\u00e1lido ou expirado.' })
  code!: string;
}
