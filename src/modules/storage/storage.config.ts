import { ConfigService } from '@nestjs/config';

export type StorageConfig = {
  accountId: string;
  accessKey: string;
  accessSecretKey: string;
  bucketName: string;
  publicBaseUrl: string;
  endpoint: string;
};

export function getStorageConfig(configService: ConfigService): StorageConfig {
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
