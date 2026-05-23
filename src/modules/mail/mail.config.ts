import { ConfigService } from '@nestjs/config';

export interface MailConfiguration {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getMailConfiguration(
  configService: ConfigService,
): MailConfiguration {
  return {
    host: configService.getOrThrow<string>('NODEMAILER_HOST'),
    port: Number(configService.getOrThrow<string>('NODEMAILER_PORT')),
    secure: parseBoolean(
      configService.getOrThrow<string>('NODEMAILER_SECURE'),
      'NODEMAILER_SECURE',
    ),
    requireTLS: parseBoolean(
      configService.getOrThrow<string>('NODEMAILER_REQUIRE_TLS'),
      'NODEMAILER_REQUIRE_TLS',
    ),
    user: configService.getOrThrow<string>('NODEMAILER_USER'),
    pass: configService.getOrThrow<string>('NODEMAILER_PASS'),
    from: configService.getOrThrow<string>('NODEMAILER_FROM'),
  };
}

function parseBoolean(value: string, key: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw new Error(`${key} must be "true" or "false".`);
}
