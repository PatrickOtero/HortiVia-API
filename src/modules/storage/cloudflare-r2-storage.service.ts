import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStorageConfig } from './storage.config';
import type { UploadFile } from './types/upload-file';
import type { UploadResult } from './types/upload-result';

@Injectable()
export class CloudflareR2StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;

  constructor(configService: ConfigService) {
    const config = getStorageConfig(configService);

    this.bucketName = config.bucketName;
    this.publicBaseUrl = config.publicBaseUrl;
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.accessSecretKey,
      },
    });
  }

  async uploadFile(objectKey: string, file: UploadFile): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return {
      url: `${this.publicBaseUrl}/${objectKey}`,
    };
  }
}
