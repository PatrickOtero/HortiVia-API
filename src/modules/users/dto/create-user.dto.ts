import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
