import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudflareR2StorageService } from '../storage/cloudflare-r2-storage.service';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';
import { ArticlesModule } from './articles.module';
import { ArticleAccessService } from './article-access.service';
import { ArticleBlockImagesService } from './article-block-images.service';
import { ArticleImagesService } from './article-images.service';
import { ArticleManagementService } from './article-management.service';
import { ArticleQueriesService } from './article-queries.service';
import { ArticleSlugService } from './article-slug.service';
import { ArticlesService } from './articles.service';

describe('ArticlesModule providers', () => {
  it('initializes the article facade and specialized services through Nest DI', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'articles-module-test-secret',
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
        ArticlesModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(CloudflareR2StorageService)
      .useValue({})
      .compile();

    const app = module.createNestApplication();
    await app.init();

    expect(app.get(ArticlesService)).toBeInstanceOf(ArticlesService);
    expect(app.get(StorageUploadCompensationService)).toBeInstanceOf(StorageUploadCompensationService);
    expect(app.get(ArticleAccessService)).toBeInstanceOf(ArticleAccessService);
    expect(app.get(ArticleQueriesService)).toBeInstanceOf(ArticleQueriesService);
    expect(app.get(ArticleManagementService)).toBeInstanceOf(ArticleManagementService);
    expect(app.get(ArticleSlugService)).toBeInstanceOf(ArticleSlugService);
    expect(app.get(ArticleImagesService)).toBeInstanceOf(ArticleImagesService);
    expect(app.get(ArticleBlockImagesService)).toBeInstanceOf(ArticleBlockImagesService);

    await app.close();
  });
});
