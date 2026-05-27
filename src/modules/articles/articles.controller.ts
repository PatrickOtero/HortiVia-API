import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CONTENT_IMAGE_MAX_FILE_SIZE } from '../storage/image-upload.constants';
import { ImageUploadExceptionFilter } from '../storage/image-upload.exception-filter';
import { ArticlesService } from './articles.service';
import { CreateArticleBlockDto } from './dto/create-article-block.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { UpdateArticleBlockDto } from './dto/update-article-block.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  async list(@Query() query: ListArticlesQueryDto) {
    return this.articlesService.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.articlesService.getById(id);
  }

  @Post(':articleId/save')
  @UseGuards(JwtAuthGuard)
  async saveArticle(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articlesService.saveArticle(user.userId, articleId);
  }

  @Delete(':articleId/save')
  @UseGuards(JwtAuthGuard)
  async unsaveArticle(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articlesService.unsaveArticle(user.userId, articleId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articlesService.create(createArticleDto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articlesService.update(id, updateArticleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }

  @Post(':articleId/blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createBlock(
    @Param('articleId') articleId: string,
    @Body() createArticleBlockDto: CreateArticleBlockDto,
  ) {
    return this.articlesService.createBlock(articleId, createArticleBlockDto);
  }

  @Patch(':articleId/blocks/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateBlock(
    @Param('articleId') articleId: string,
    @Param('blockId') blockId: string,
    @Body() updateArticleBlockDto: UpdateArticleBlockDto,
  ) {
    return this.articlesService.updateBlock(
      articleId,
      blockId,
      updateArticleBlockDto,
    );
  }

  @Delete(':articleId/blocks/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteBlock(
    @Param('articleId') articleId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.articlesService.deleteBlock(articleId, blockId);
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseFilters(new ImageUploadExceptionFilter('5 MB'))
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: CONTENT_IMAGE_MAX_FILE_SIZE,
      },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile()
    file?:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
  ) {
    return this.articlesService.uploadImage(
      id,
      file
        ? {
            buffer: file.buffer,
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname,
          }
        : undefined,
    );
  }
}
