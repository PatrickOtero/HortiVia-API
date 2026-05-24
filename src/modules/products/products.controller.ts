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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CONTENT_IMAGE_MAX_FILE_SIZE } from '../storage/image-upload.constants';
import { ImageUploadExceptionFilter } from '../storage/image-upload.exception-filter';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductGuideSectionDto } from './dto/create-product-guide-section.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductGuideSectionDto } from './dto/update-product-guide-section.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async list(@Query() query: ListProductsQueryDto) {
    return this.productsService.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
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
    return this.productsService.uploadImage(
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

  @Post(':productId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createImage(
    @Param('productId') productId: string,
    @Body() createProductImageDto: CreateProductImageDto,
  ) {
    return this.productsService.createImage(productId, createProductImageDto);
  }

  @Patch(':productId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateImageMetadata(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() updateProductImageDto: UpdateProductImageDto,
  ) {
    return this.productsService.updateImage(
      productId,
      imageId,
      updateProductImageDto,
    );
  }

  @Delete(':productId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteImage(productId, imageId);
  }

  @Post(':productId/guide-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createGuideSection(
    @Param('productId') productId: string,
    @Body() createProductGuideSectionDto: CreateProductGuideSectionDto,
  ) {
    return this.productsService.createGuideSection(
      productId,
      createProductGuideSectionDto,
    );
  }

  @Patch(':productId/guide-sections/:sectionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateGuideSection(
    @Param('productId') productId: string,
    @Param('sectionId') sectionId: string,
    @Body() updateProductGuideSectionDto: UpdateProductGuideSectionDto,
  ) {
    return this.productsService.updateGuideSection(
      productId,
      sectionId,
      updateProductGuideSectionDto,
    );
  }

  @Delete(':productId/guide-sections/:sectionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteGuideSection(
    @Param('productId') productId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.productsService.deleteGuideSection(productId, sectionId);
  }
}
