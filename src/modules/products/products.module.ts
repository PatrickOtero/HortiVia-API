import { Module } from '@nestjs/common';
import { ArticlesModule } from '../articles/articles.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { FavoritesController } from './favorites.controller';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductAccessService } from './product-access.service';
import { ProductArticleRelationsService } from './product-article-relations.service';
import { ProductFavoritesService } from './product-favorites.service';
import { ProductGalleryService } from './product-gallery.service';
import { ProductGuideSectionsService } from './product-guide-sections.service';
import { ProductImagesService } from './product-images.service';
import { ProductManagementService } from './product-management.service';
import { ProductQueriesService } from './product-queries.service';
import { ProductSlugService } from './product-slug.service';

@Module({
  imports: [AuthModule, StorageModule, ArticlesModule],
  controllers: [ProductsController, FavoritesController],
  providers: [
    ProductsRepository,
    ProductAccessService,
    ProductArticleRelationsService,
    ProductFavoritesService,
    ProductGalleryService,
    ProductGuideSectionsService,
    ProductImagesService,
    ProductManagementService,
    ProductQueriesService,
    ProductSlugService,
    ProductsService,
  ],
  exports: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
