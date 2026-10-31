import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudflareR2StorageService } from '../storage/cloudflare-r2-storage.service';
import { ProductAccessService } from './product-access.service';
import { ProductArticleRelationsService } from './product-article-relations.service';
import { ProductFavoritesService } from './product-favorites.service';
import { ProductGalleryService } from './product-gallery.service';
import { ProductGuideSectionsService } from './product-guide-sections.service';
import { ProductImagesService } from './product-images.service';
import { ProductManagementService } from './product-management.service';
import { ProductQueriesService } from './product-queries.service';
import { ProductSlugService } from './product-slug.service';
import { ProductsModule } from './products.module';
import { ProductsService } from './products.service';

describe('ProductsModule providers', () => {
  it('initializes the facade and specialized services through Nest DI', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'products-module-test-secret',
            DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/hortivia_training_test_ci',
            NODEMAILER_HOST: '127.0.0.1',
            NODEMAILER_PORT: '2525',
            NODEMAILER_SECURE: 'false',
            NODEMAILER_REQUIRE_TLS: 'false',
            NODEMAILER_USER: 'test@example.invalid',
            NODEMAILER_PASS: 'test-only',
            NODEMAILER_FROM: 'test@example.invalid',
            EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES: '10',
            PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES: '10',
          })],
        }),
        PrismaModule,
        ProductsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(CloudflareR2StorageService)
      .useValue({})
      .compile();

    const app = module.createNestApplication();
    await app.init();
    for (const provider of [
      ProductsService,
      ProductAccessService,
      ProductArticleRelationsService,
      ProductFavoritesService,
      ProductGalleryService,
      ProductGuideSectionsService,
      ProductImagesService,
      ProductManagementService,
      ProductQueriesService,
      ProductSlugService,
    ]) {
      expect(app.get(provider)).toBeInstanceOf(provider);
    }
    await app.close();
  });
});
