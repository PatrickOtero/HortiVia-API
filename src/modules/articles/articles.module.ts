import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ArticlesController } from './articles.controller';
import { ArticlesRepository } from './articles.repository';
import { SavedArticlesController } from './saved-articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ArticlesController, SavedArticlesController],
  providers: [ArticlesRepository, ArticlesService],
  exports: [ArticlesRepository, ArticlesService],
})
export class ArticlesModule {}
