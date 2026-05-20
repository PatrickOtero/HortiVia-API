import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { ProductsModule } from './modules/products/products.module';
import { ProfileModule } from './modules/profile/profile.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    ArticlesModule,
    ProfileModule,
    PreferencesModule,
  ],
})
export class AppModule {}
