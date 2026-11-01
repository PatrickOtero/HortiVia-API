import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getStorageConfig } from './storage.config';
import type { UploadFile } from './types/upload-file';
import type { PresignedUploadResult } from './types/presigned-upload-result';
import type { UploadResult } from './types/upload-result';
import { PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS } from './presigned-upload.constants';

type StorageClientContext = {
  client: S3Client;
  bucketName: string;
  publicBaseUrl: string;
};

@Injectable()
export class CloudflareR2StorageService {
  private context: StorageClientContext | null = null;
  private readonly logger = new Logger(CloudflareR2StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(objectKey: string, file: UploadFile): Promise<UploadResult> {
    const { client, bucketName, publicBaseUrl } = this.getContext();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimeType,
        }),
      );
    } catch (error) {
      this.logger.error(
        'R2 upload failed; its final outcome may be ambiguous, so no object was deleted.',
        error instanceof Error ? error.name : 'UnknownError',
      );
      throw error;
    }

    return {
      url: `${publicBaseUrl}/${objectKey}`,
      key: objectKey,
    };
  }

  async deleteFile(objectKey: string): Promise<void> {
    const { client, bucketName } = this.getContext();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );
  }

  async inspectObject(objectKey: string) {
    const { client, bucketName } = this.getContext();
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }));
      return {
        exists: true as const,
        size: result.ContentLength,
        contentType: result.ContentType,
        etag: result.ETag,
      };
    } catch (error) {
      if (this.isMissingObjectError(error)) return { exists: false as const };
      throw error;
    }
  }

  async createPresignedUploadUrl(
    objectKey: string,
    contentType: string,
  ): Promise<PresignedUploadResult> {
    const { client, bucketName, publicBaseUrl } = this.getContext();

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
      }),
      {
        expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
      },
    );

    return {
      key: objectKey,
      uploadUrl,
      url: `${publicBaseUrl}/${objectKey}`,
    };
  }

  getPublicBaseUrl() {
    return this.getContext().publicBaseUrl;
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

  private isMissingObjectError(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    return candidate.$metadata?.httpStatusCode === 404 ||
      candidate.name === 'NotFound' || candidate.name === 'NoSuchKey';
  }
}
