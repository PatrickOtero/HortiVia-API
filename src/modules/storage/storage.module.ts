import { Module } from '@nestjs/common';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [CloudflareR2StorageService, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
