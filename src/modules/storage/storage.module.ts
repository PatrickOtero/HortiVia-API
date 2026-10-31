import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import { ManagedImageReferencesRepository } from './managed-image-references.repository';
import { StorageService } from './storage.service';
import { StorageUploadCompensationService } from './storage-upload-compensation.service';

@Module({
  imports: [PrismaModule],
  providers: [
    CloudflareR2StorageService,
    ManagedImageReferencesRepository,
    StorageService,
    StorageUploadCompensationService,
  ],
  exports: [StorageService, StorageUploadCompensationService, ManagedImageReferencesRepository],
})
export class StorageModule {}
