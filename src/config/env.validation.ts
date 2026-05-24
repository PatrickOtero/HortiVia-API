import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  NODEMAILER_HOST!: string;

  @IsString()
  NODEMAILER_USER!: string;

  @IsString()
  NODEMAILER_PASS!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  NODEMAILER_PORT!: number;

  @IsString()
  NODEMAILER_SECURE!: string;

  @IsString()
  NODEMAILER_REQUIRE_TLS!: string;

  @IsString()
  NODEMAILER_FROM!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  EMAIL_CONFIRMATION_MAX_ATTEMPTS!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  PASSWORD_RESET_MAX_ATTEMPTS!: number;

  @IsOptional()
  @IsString()
  CLOUDFLARE_ACCOUNT_ID?: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_ACCESS_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_BUCKET_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: 'development' | 'test' | 'production';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .flatMap(error => Object.values(error.constraints ?? {}))
      .join(', ');

    throw new Error(`Environment validation failed: ${formattedErrors}`);
  }

  return validatedConfig;
}
