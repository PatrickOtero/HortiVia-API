import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type StorageConfig = {
  accountId: string;
  accessKey: string;
  accessSecretKey: string;
  bucketName: string;
  publicBaseUrl: string;
  endpoint: string;
};

const REQUIRED_STORAGE_ENV_KEYS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_ACCESS_KEY',
  'CLOUDFLARE_ACCESS_SECRET_KEY',
  'CLOUDFLARE_BUCKET_NAME',
  'CLOUDFLARE_PUBLIC_BASE_URL',
] as const;

export function getStorageConfig(configService: ConfigService): StorageConfig {
  const missingKeys = REQUIRED_STORAGE_ENV_KEYS.filter(key => {
    const value = configService.get<string>(key);

    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new InternalServerErrorException({
      message: 'Upload de imagem indisponivel no momento.',
      error: 'Internal Server Error',
    });
  }

  const accountId = configService.getOrThrow<string>('CLOUDFLARE_ACCOUNT_ID');
  const accessKey = configService.getOrThrow<string>('CLOUDFLARE_ACCESS_KEY');
  const accessSecretKey = configService.getOrThrow<string>(
    'CLOUDFLARE_ACCESS_SECRET_KEY',
  );
  const bucketName = configService.getOrThrow<string>('CLOUDFLARE_BUCKET_NAME');
  const publicBaseUrl = configService
    .getOrThrow<string>('CLOUDFLARE_PUBLIC_BASE_URL')
    .replace(/\/+$/, '');

  return {
    accountId,
    accessKey,
    accessSecretKey,
    bucketName,
    publicBaseUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
