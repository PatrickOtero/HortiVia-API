import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toProductDetailResponse } from './mappers/product-response.mapper';
import { ProductsRepository } from './products.repository';
import { ProductAccessService } from './product-access.service';
import { StorageService } from '../storage/storage.service';
import type { UploadFile } from '../storage/types/upload-file';
import { validateContentImageFile } from '../storage/image-upload.validation';
import type { ProductDetailResponse } from './types/product-response';
import { isProductPrismaError, productNotFoundException } from './utils/product-errors.util';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productAccessService: ProductAccessService,
    private readonly storageService: StorageService,
  ) {}

  async upload(id: string, file?: UploadFile): Promise<ProductDetailResponse> {
    await this.productAccessService.requireActiveProduct(id);
    const imageFile = validateContentImageFile(file);
    try {
      const uploadResult = await this.storageService.uploadProductImage(id, imageFile);
      const product = await this.productsRepository.updateImageUrl(id, uploadResult.url);
      return toProductDetailResponse(product);
    } catch (error) {
      if (isProductPrismaError(error, 'P2025')) throw productNotFoundException();
      throw new InternalServerErrorException({
        message: 'N\u00e3o foi poss\u00edvel enviar a imagem.',
        error: 'Internal Server Error',
      });
    }
  }
}
