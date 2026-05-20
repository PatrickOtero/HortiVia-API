import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

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
