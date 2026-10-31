import { Injectable, Logger } from '@nestjs/common';
import type { ManagedImageScope } from './types/managed-image-scope';
import type { UploadResult } from './types/upload-result';
import { ManagedImageReferencesRepository } from './managed-image-references.repository';
import { StorageService } from './storage.service';

@Injectable()
export class StorageUploadCompensationService {
  private readonly logger = new Logger(StorageUploadCompensationService.name);

  constructor(
    private readonly referencesRepository: ManagedImageReferencesRepository,
    private readonly storageService: StorageService,
  ) {}

  async removeIfUnreferenced(upload: UploadResult, scope: ManagedImageScope) {
    try {
      if (await this.referencesRepository.isReferenced(upload.url)) {
        this.logger.warn(`Skipped R2 compensation; uploaded ${scope.kind} image is still referenced.`);
        return false;
      }

      await this.storageService.deleteManagedUpload(upload, scope);
      return true;
    } catch (error) {
      this.logger.error(
        `R2 compensation failed for ${scope.kind}; object preserved if deletion was not confirmed.`,
        error instanceof Error ? error.name : 'UnknownError',
      );
      return false;
    }
  }
}
