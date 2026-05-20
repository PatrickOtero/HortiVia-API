import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStorageConfig } from './storage.config';
import type { UploadFile } from './types/upload-file';
import type { UploadResult } from './types/upload-result';

type StorageClientContext = {
  client: S3Client;
  bucketName: string;
  publicBaseUrl: string;
};

@Injectable()
export class CloudflareR2StorageService {
  private readonly logger = new Logger(CloudflareR2StorageService.name);
  private context: StorageClientContext | null = null;

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(objectKey: string, file: UploadFile): Promise<UploadResult> {
    const { client, bucketName, publicBaseUrl } = this.getContext();

    this.logger.log(`Uploading avatar object ${objectKey}`);

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return {
      url: `${publicBaseUrl}/${objectKey}`,
    };
  }

  private getContext(): StorageClientContext {
    if (this.context) {
      return this.context;
    }

    const config = getStorageConfig(this.configService);

    this.context = {
      bucketName: config.bucketName,
      publicBaseUrl: config.publicBaseUrl,
      client: new S3Client({
        region: 'auto',
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.accessSecretKey,
        },
      }),
    };

    return this.context;
  }
}
