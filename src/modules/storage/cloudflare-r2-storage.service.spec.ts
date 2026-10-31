import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import type { UploadFile } from './types/upload-file';

describe('CloudflareR2StorageService', () => {
  const configValues: Record<string, string> = {
    CLOUDFLARE_ACCOUNT_ID: 'test-account',
    CLOUDFLARE_ACCESS_KEY: 'test-access-key',
    CLOUDFLARE_ACCESS_SECRET_KEY: 'test-secret-key',
    CLOUDFLARE_BUCKET_NAME: 'test-bucket',
    CLOUDFLARE_PUBLIC_BASE_URL: 'https://cdn.example.test/',
  };
  const config = {
    get: (key: string) => configValues[key],
    getOrThrow: (key: string) => configValues[key],
  };
  let send: jest.SpyInstance;

  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
  });

  afterEach(() => send.mockRestore());

  it('returns the exact backend-generated key with the public URL after upload', async () => {
    const service = new CloudflareR2StorageService(config as never);
    const file: UploadFile = { buffer: Buffer.from('test'), mimeType: 'image/webp', size: 4 };
    const result = await service.uploadFile('products/product-1/1716163200000-a1b2c3d4.webp', file);
    expect(result).toEqual({
      url: 'https://cdn.example.test/products/product-1/1716163200000-a1b2c3d4.webp',
      key: 'products/product-1/1716163200000-a1b2c3d4.webp',
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
  });

  it('uses DeleteObjectCommand for exactly one key in the configured bucket', async () => {
    const service = new CloudflareR2StorageService(config as never);
    await service.deleteFile('articles/article-1/1716163200000-a1b2c3d4.webp');
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'test-bucket',
      Key: 'articles/article-1/1716163200000-a1b2c3d4.webp',
    });
  });

  it('propagates a failed delete instead of reporting successful cleanup', async () => {
    send.mockRejectedValueOnce(new Error('R2 unavailable'));
    const service = new CloudflareR2StorageService(config as never);
    await expect(service.deleteFile('articles/article-1/1716163200000-a1b2c3d4.webp'))
      .rejects.toThrow('R2 unavailable');
  });
});
