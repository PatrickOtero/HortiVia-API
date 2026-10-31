import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ArticlesController } from './articles.controller';
import { ArticlesRepository } from './articles.repository';
import { SavedArticlesController } from './saved-articles.controller';
import { ArticlesService } from './articles.service';
import { ArticleCommentsService } from './article-comments.service';
import { ArticleEngagementService } from './article-engagement.service';
import { ArticleBlocksService } from './article-blocks.service';
import { ArticleAccessService } from './article-access.service';
import { ArticleBlockImagesService } from './article-block-images.service';
import { ArticleImagesService } from './article-images.service';
import { ArticleManagementService } from './article-management.service';
import { ArticleQueriesService } from './article-queries.service';
import { ArticleSlugService } from './article-slug.service';
import { ArticleBlockUploadIntentsRepository } from './article-block-upload-intents.repository';
import { ArticleBlockUploadTrackingService } from './article-block-upload-tracking.service';
import { PresignedUploadReconciliationService } from './presigned-upload-reconciliation.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ArticlesController, SavedArticlesController],
  providers: [
    ArticlesRepository,
    ArticleCommentsService,
    ArticleEngagementService,
    ArticleBlocksService,
    ArticleAccessService,
    ArticleBlockImagesService,
    ArticleBlockUploadIntentsRepository,
    ArticleBlockUploadTrackingService,
    PresignedUploadReconciliationService,
    ArticleImagesService,
    ArticleManagementService,
    ArticleQueriesService,
    ArticleSlugService,
    ArticlesService,
  ],
  exports: [ArticlesRepository, ArticlesService],
})
export class ArticlesModule {}
