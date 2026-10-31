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

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ArticlesController, SavedArticlesController],
  providers: [
    ArticlesRepository,
    ArticleCommentsService,
    ArticleEngagementService,
    ArticleBlocksService,
    ArticlesService,
  ],
  exports: [ArticlesRepository, ArticlesService],
})
export class ArticlesModule {}
