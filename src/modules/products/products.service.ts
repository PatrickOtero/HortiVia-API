import { Injectable } from '@nestjs/common';
import type { UploadFile } from '../storage/types/upload-file';
import type { CreateProductGuideSectionDto } from './dto/create-product-guide-section.dto';
import type { CreateProductImageDto } from './dto/create-product-image.dto';
import type { CreateProductImageUploadDto } from './dto/create-product-image-upload.dto';
import type { ListFavoriteProductsQueryDto } from './dto/list-favorite-products-query.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQueryDto } from './dto/list-products-query.dto';
import type { UpdateProductGuideSectionDto } from './dto/update-product-guide-section.dto';
import type { UpdateProductImageFileDto } from './dto/update-product-image-file.dto';
import type { UpdateProductImageDto } from './dto/update-product-image.dto';
import type { UpdateProductArticleRelationDto } from './dto/update-product-article-relation.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { ProductArticleRelationsService } from './product-article-relations.service';
import { ProductFavoritesService } from './product-favorites.service';
import { ProductGalleryService } from './product-gallery.service';
import { ProductGuideSectionsService } from './product-guide-sections.service';
import { ProductImagesService } from './product-images.service';
import { ProductManagementService } from './product-management.service';
import { ProductQueriesService } from './product-queries.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly queries: ProductQueriesService,
    private readonly management: ProductManagementService,
    private readonly favorites: ProductFavoritesService,
    private readonly articleRelations: ProductArticleRelationsService,
    private readonly images: ProductImagesService,
    private readonly gallery: ProductGalleryService,
    private readonly guideSections: ProductGuideSectionsService,
  ) {}

  list(query: ListProductsQueryDto) {
    return this.queries.list(query);
  }

  getById(id: string) {
    return this.queries.getById(id);
  }

  create(dto: CreateProductDto) {
    return this.management.create(dto);
  }

  update(id: string, dto: UpdateProductDto) {
    return this.management.update(id, dto);
  }

  deactivate(id: string) {
    return this.management.deactivate(id);
  }

  favoriteProduct(userId: string, productId: string) {
    return this.favorites.favoriteProduct(userId, productId);
  }

  unfavoriteProduct(userId: string, productId: string) {
    return this.favorites.unfavoriteProduct(userId, productId);
  }

  listFavoriteProducts(userId: string, query: ListFavoriteProductsQueryDto) {
    return this.favorites.listFavoriteProducts(userId, query);
  }

  relateArticle(productId: string, articleId: string) {
    return this.articleRelations.relate(productId, articleId);
  }

  updateArticleRelation(
    productId: string,
    articleId: string,
    dto: UpdateProductArticleRelationDto,
  ) {
    return this.articleRelations.update(productId, articleId, dto);
  }

  removeArticleRelation(productId: string, articleId: string) {
    return this.articleRelations.remove(productId, articleId);
  }

  uploadImage(id: string, file?: UploadFile) {
    return this.images.upload(id, file);
  }

  createImage(productId: string, dto: CreateProductImageDto) {
    return this.gallery.create(productId, dto);
  }

  createImageWithUpload(
    productId: string,
    dto: CreateProductImageUploadDto,
    file?: UploadFile,
  ) {
    return this.gallery.createWithUpload(productId, dto, file);
  }

  updateImage(productId: string, imageId: string, dto: UpdateProductImageDto) {
    return this.gallery.update(productId, imageId, dto);
  }

  replaceImageFile(
    productId: string,
    imageId: string,
    dto: UpdateProductImageFileDto,
    file?: UploadFile,
  ) {
    return this.gallery.replaceFile(productId, imageId, dto, file);
  }

  deleteImage(productId: string, imageId: string) {
    return this.gallery.delete(productId, imageId);
  }

  createGuideSection(productId: string, dto: CreateProductGuideSectionDto) {
    return this.guideSections.create(productId, dto);
  }

  updateGuideSection(
    productId: string,
    sectionId: string,
    dto: UpdateProductGuideSectionDto,
  ) {
    return this.guideSections.update(productId, sectionId, dto);
  }

  uploadGuideSectionImage(productId: string, sectionId: string, file?: UploadFile) {
    return this.guideSections.uploadImage(productId, sectionId, file);
  }

  removeGuideSectionImage(productId: string, sectionId: string) {
    return this.guideSections.removeImage(productId, sectionId);
  }

  deleteGuideSection(productId: string, sectionId: string) {
    return this.guideSections.delete(productId, sectionId);
  }
}
