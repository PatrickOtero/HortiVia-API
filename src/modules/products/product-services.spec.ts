import {
  ArticleCategory,
  ProductCategory,
  ProductGuideSectionKind,
  ProductImageKind,
} from '../../generated/prisma/enums';
import { ArticlesRepository } from '../articles/articles.repository';
import { StorageService } from '../storage/storage.service';
import { ProductsRepository } from './products.repository';
import { ProductAccessService } from './product-access.service';
import { ProductArticleRelationsService } from './product-article-relations.service';
import { ProductFavoritesService } from './product-favorites.service';
import { ProductGalleryService } from './product-gallery.service';
import { ProductGuideSectionsService } from './product-guide-sections.service';
import { ProductImagesService } from './product-images.service';
import { ProductManagementService } from './product-management.service';
import { ProductQueriesService } from './product-queries.service';
import { ProductSlugService } from './product-slug.service';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';

describe('Product domain services', () => {
  const product = {
    id: 'product-1', name: 'Abacate', slug: 'abacate', category: ProductCategory.FRUIT,
    shortDescription: 'Descrição curta', description: null, imageUrl: null,
    benefits: [], howToChoose: [], howToStore: [], usageTips: [], nutrients: [],
    isActive: true, createdAt: new Date('2026-05-20T00:00:00Z'), updatedAt: new Date('2026-05-20T00:00:00Z'),
    images: [], guideSections: [], articleRelations: [],
  };
  const image = {
    id: 'image-1', productId: product.id, url: 'https://cdn.test/image.webp',
    alt: null, caption: null, kind: ProductImageKind.HERO, sortOrder: 0,
    isPrimary: false, createdAt: product.createdAt, updatedAt: product.updatedAt,
  };
  const guide = {
    id: 'guide-1', productId: product.id, kind: ProductGuideSectionKind.CHOOSE,
    title: 'Escolha', body: 'Texto', imageUrl: null, imageAlt: null, imageCaption: null,
    bullets: [], idealPoints: [], avoidPoints: [], sortOrder: 0,
    createdAt: product.createdAt, updatedAt: product.updatedAt,
  };
  const article = { id: 'article-1', isPublished: false, category: ArticleCategory.TIPS };
  const prismaError = (code: string) => Object.assign(new Error(code), { code });

  let repo: jest.Mocked<ProductsRepository>;
  let articles: jest.Mocked<Pick<ArticlesRepository, 'findById'>>;
  let storage: jest.Mocked<StorageService>;
  let uploadCompensation: jest.Mocked<StorageUploadCompensationService>;
  let access: ProductAccessService;

  beforeEach(() => {
    repo = {
      findManyWithPagination: jest.fn(), count: jest.fn(), findFavoriteByUserAndProduct: jest.fn(),
      findById: jest.fn(), findBySlug: jest.fn(), create: jest.fn(), update: jest.fn(),
      updateImageUrl: jest.fn(), deactivate: jest.fn(), createFavorite: jest.fn(),
      deleteFavorite: jest.fn(), listFavoritesByUser: jest.fn(), countFavoritesByUser: jest.fn(),
      getFavoriteProductIdsForUser: jest.fn(), findProductArticleRelation: jest.fn(),
      upsertProductArticleRelation: jest.fn(), updateProductArticleRelation: jest.fn(),
      deleteProductArticleRelation: jest.fn(), findProductImageById: jest.fn(),
      createProductImage: jest.fn(), updateProductImage: jest.fn(), clearPrimaryProductImages: jest.fn(),
      deleteProductImage: jest.fn(), deleteProductImageIfUrlEmpty: jest.fn(), findProductGuideSectionById: jest.fn(),
      createProductGuideSection: jest.fn(), updateProductGuideSection: jest.fn(),
      updateProductGuideSectionImage: jest.fn(), deleteProductGuideSection: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;
    articles = { findById: jest.fn() } as unknown as jest.Mocked<Pick<ArticlesRepository, 'findById'>>;
    storage = {
      uploadProductImage: jest.fn(), uploadProductGalleryImage: jest.fn(),
      uploadProductGuideSectionImage: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;
    uploadCompensation = {
      removeIfUnreferenced: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<StorageUploadCompensationService>;
    repo.findById.mockResolvedValue(product as never);
    repo.findBySlug.mockResolvedValue(null);
    repo.findProductImageById.mockResolvedValue(image as never);
    repo.findProductGuideSectionById.mockResolvedValue(guide as never);
    articles.findById.mockResolvedValue(article as never);
    access = new ProductAccessService(repo, articles as unknown as ArticlesRepository);
  });

  it('queries active catalog with normalized search, pagination and response mapping', async () => {
    repo.findManyWithPagination.mockResolvedValue([product] as never);
    repo.count.mockResolvedValue(1);
    const result = await new ProductQueriesService(repo).list({ search: '  abacate  ', page: 2, limit: 5 });
    expect(repo.findManyWithPagination).toHaveBeenCalledWith({
      where: { isActive: true, name: { contains: 'abacate', mode: 'insensitive' } }, skip: 5, take: 5,
    });
    expect(result.meta).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
  });

  it('normalizes product fields and uses the unique slug when creating', async () => {
    repo.findBySlug.mockResolvedValueOnce(product as never).mockResolvedValueOnce(null);
    repo.create.mockResolvedValue({ ...product, slug: 'abacate-2' } as never);
    const service = new ProductManagementService(repo, access, new ProductSlugService(repo));
    const result = await service.create({
      name: ' Abacate ', category: ProductCategory.FRUIT, shortDescription: ' resumo ',
      benefits: [' energia ', ' '], nutrients: [{ label: ' Vitamina ', value: ' C ' }],
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Abacate', slug: 'abacate-2', shortDescription: 'resumo', benefits: ['energia'],
      nutrients: [{ label: 'Vitamina', value: 'C' }],
    }));
    expect(result.slug).toBe('abacate-2');
  });

  it('translates a concurrent slug uniqueness conflict on create and update', async () => {
    const service = new ProductManagementService(repo, access, new ProductSlugService(repo));
    repo.create.mockRejectedValue(prismaError('P2002'));
    await expect(service.create({ name: 'Abacate', category: ProductCategory.FRUIT, shortDescription: 'x' }))
      .rejects.toMatchObject({ status: 409 });
    repo.update.mockRejectedValue(prismaError('P2002'));
    await expect(service.update(product.id, { name: 'Banana' })).rejects.toMatchObject({ status: 409 });
  });

  it('updates only provided fields and returns the current record for an empty patch', async () => {
    const service = new ProductManagementService(repo, access, new ProductSlugService(repo));
    repo.update.mockResolvedValue({ ...product, shortDescription: 'Nova' } as never);
    await service.update(product.id, { shortDescription: ' Nova ' });
    expect(repo.update).toHaveBeenCalledWith(product.id, { shortDescription: 'Nova' });
    repo.update.mockClear();
    await service.update(product.id, {});
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('keeps inactive products unavailable to edits and maps a concurrent delete', async () => {
    const service = new ProductManagementService(repo, access, new ProductSlugService(repo));
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.update(product.id, { name: 'Novo' })).rejects.toMatchObject({ status: 404 });
    repo.update.mockRejectedValue(prismaError('P2025'));
    await expect(service.update(product.id, { shortDescription: 'Nova' })).rejects.toMatchObject({ status: 404 });
  });

  it('deactivates only an active product and translates a concurrent removal', async () => {
    const service = new ProductManagementService(repo, access, new ProductSlugService(repo));
    repo.deactivate.mockResolvedValue({} as never);
    await expect(service.deactivate(product.id)).resolves.toEqual({ message: 'Produto removido.' });
    repo.deactivate.mockRejectedValue(prismaError('P2025'));
    await expect(service.deactivate(product.id)).rejects.toMatchObject({ status: 404 });
  });

  it('treats concurrent favorite creation and removal as idempotent', async () => {
    const service = new ProductFavoritesService(repo, access);
    repo.findFavoriteByUserAndProduct.mockResolvedValue(null);
    repo.createFavorite.mockRejectedValue(prismaError('P2002'));
    await expect(service.favoriteProduct('user-1', product.id)).resolves.toEqual({
      message: 'Produto adicionado aos favoritos.',
    });
    repo.findFavoriteByUserAndProduct.mockResolvedValue({ id: 'f', userId: 'u', productId: product.id, createdAt: product.createdAt } as never);
    repo.deleteFavorite.mockRejectedValue(prismaError('P2025'));
    await expect(service.unfavoriteProduct('user-1', product.id)).resolves.toEqual({
      message: 'Produto removido dos favoritos.',
    });
  });

  it('rejects relations with missing entities and preserves idempotent creation', async () => {
    const service = new ProductArticleRelationsService(repo, access);
    articles.findById.mockResolvedValueOnce(null);
    await expect(service.relate(product.id, 'missing')).rejects.toMatchObject({ status: 404 });
    expect(repo.upsertProductArticleRelation).not.toHaveBeenCalled();
    await service.relate(product.id, article.id);
    expect(repo.upsertProductArticleRelation).toHaveBeenCalledWith(product.id, article.id);
  });

  it('requires an existing relation before changing its order', async () => {
    const service = new ProductArticleRelationsService(repo, access);
    repo.findProductArticleRelation.mockResolvedValue(null);
    await expect(service.update(product.id, article.id, { sortOrder: 4 })).rejects.toMatchObject({ status: 404 });
    expect(repo.updateProductArticleRelation).not.toHaveBeenCalled();
    repo.findProductArticleRelation.mockResolvedValue({ id: 'r' } as never);
    await service.update(product.id, article.id, { sortOrder: 4 });
    expect(repo.updateProductArticleRelation).toHaveBeenCalledWith(product.id, article.id, { sortOrder: 4 });
  });

  it('compensates a failed gallery upload by deleting its temporary database row', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    repo.createProductImage.mockResolvedValue({ ...image, url: '' } as never);
    repo.findProductImageById.mockResolvedValue({ ...image, url: '' } as never);
    repo.deleteProductImageIfUrlEmpty.mockResolvedValue({ count: 1 } as never);
    storage.uploadProductGalleryImage.mockRejectedValue(new Error('storage down'));
    await expect(service.createWithUpload(product.id, { kind: ProductImageKind.HERO }, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500 });
    expect(repo.deleteProductImageIfUrlEmpty).toHaveBeenCalledWith(image.id);
  });

  it('persists a successful gallery upload without running compensation', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    const uploaded = {
      url: 'https://cdn.test/products/product-1/gallery/image-1/1716163200000-a1b2c3d4.webp',
      key: 'products/product-1/gallery/image-1/1716163200000-a1b2c3d4.webp',
    };
    repo.createProductImage.mockResolvedValue({ ...image, url: '' } as never);
    storage.uploadProductGalleryImage.mockResolvedValue(uploaded as never);
    repo.updateProductImage.mockResolvedValue({ ...image, url: uploaded.url } as never);
    const result = await service.createWithUpload(product.id, { kind: ProductImageKind.HERO }, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    });
    expect(result.url).toBe(uploaded.url);
    expect(uploadCompensation.removeIfUnreferenced).not.toHaveBeenCalled();
    expect(repo.deleteProductImage).not.toHaveBeenCalled();
  });

  it('does not delete a gallery row when compensation itself fails', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    repo.createProductImage.mockResolvedValue(image as never);
    storage.uploadProductGalleryImage.mockRejectedValue(new Error('storage down'));
    repo.deleteProductImageIfUrlEmpty.mockRejectedValue(new Error('cleanup failed'));
    await expect(service.createWithUpload(product.id, { kind: ProductImageKind.HERO }, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500 });
  });

  it('does not compensate a main image when URL persistence succeeds', async () => {
    const service = new ProductImagesService(repo, access, storage, uploadCompensation);
    const uploaded = {
      url: 'https://cdn.test/products/product-1/1716163200000-a1b2c3d4.webp',
      key: 'products/product-1/1716163200000-a1b2c3d4.webp',
    };
    storage.uploadProductImage.mockResolvedValue(uploaded as never);
    repo.updateImageUrl.mockResolvedValue({ ...product, imageUrl: uploaded.url } as never);
    await service.upload(product.id, { buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10 });
    expect(uploadCompensation.removeIfUnreferenced).not.toHaveBeenCalled();
  });

  it('compensates a main-image database failure while preserving the primary cause', async () => {
    const service = new ProductImagesService(repo, access, storage, uploadCompensation);
    const uploaded = {
      url: 'https://cdn.test/products/product-1/1716163200000-a1b2c3d4.webp',
      key: 'products/product-1/1716163200000-a1b2c3d4.webp',
    };
    const persistenceError = new Error('write failed');
    storage.uploadProductImage.mockResolvedValue(uploaded as never);
    repo.updateImageUrl.mockRejectedValue(persistenceError);
    let thrown: unknown;
    try {
      await service.upload(product.id, { buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10 });
    } catch (error) {
      thrown = error;
    }
    expect(uploadCompensation.removeIfUnreferenced).toHaveBeenCalledWith(uploaded, {
      kind: 'product-main', productId: product.id,
    });
    expect(thrown).toMatchObject({ status: 500, cause: persistenceError });
  });

  it('does not attempt deletion when the R2 upload itself fails', async () => {
    const service = new ProductImagesService(repo, access, storage, uploadCompensation);
    storage.uploadProductImage.mockRejectedValue(new Error('ambiguous R2 result'));
    await expect(service.upload(product.id, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500 });
    expect(uploadCompensation.removeIfUnreferenced).not.toHaveBeenCalled();
  });

  it('validates gallery upload before persistence and keeps primary-image ordering', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    await expect(service.createWithUpload(product.id, { kind: ProductImageKind.HERO })).rejects.toMatchObject({ status: 400 });
    expect(repo.createProductImage).not.toHaveBeenCalled();
    repo.createProductImage.mockResolvedValue({ ...image, isPrimary: true } as never);
    await service.create(product.id, { url: image.url, kind: ProductImageKind.HERO, isPrimary: true });
    expect(repo.clearPrimaryProductImages).toHaveBeenCalledWith(product.id, image.id);
  });

  it('refuses to update a gallery image belonging to another product', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    repo.findProductImageById.mockResolvedValue({ ...image, productId: 'other' } as never);
    await expect(service.update(product.id, image.id, { caption: 'x' })).rejects.toMatchObject({ status: 404 });
    expect(repo.updateProductImage).not.toHaveBeenCalled();
  });

  it('replaces a gallery file, applies metadata, and keeps the primary image exclusive', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    storage.uploadProductGalleryImage.mockResolvedValue({ url: 'https://cdn.test/new.webp' } as never);
    repo.updateProductImage.mockResolvedValue({ ...image, url: 'https://cdn.test/new.webp', isPrimary: true } as never);
    await service.replaceFile(product.id, image.id, { caption: 'Nova legenda', isPrimary: true }, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    });
    expect(repo.updateProductImage).toHaveBeenCalledWith(image.id, {
      url: 'https://cdn.test/new.webp', caption: 'Nova legenda', isPrimary: true,
    });
    expect(repo.clearPrimaryProductImages).toHaveBeenCalledWith(product.id, image.id);
  });

  it('preserves the old gallery image when the replacement upload fails', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    const oldUrl = image.url;
    storage.uploadProductGalleryImage.mockRejectedValue(new Error('R2 upload failed'));
    await expect(service.replaceFile(product.id, image.id, {}, {
      buffer: Buffer.from('new image'), mimeType: 'image/webp', size: 12,
    })).rejects.toMatchObject({ status: 500 });
    expect(repo.updateProductImage).not.toHaveBeenCalled();
    expect(uploadCompensation.removeIfUnreferenced).not.toHaveBeenCalled();
    expect(oldUrl).toBe(image.url);
  });

  it('does not delete a replacement when the write outcome is ambiguous and its URL is present', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    const uploaded = {
      url: 'https://cdn.test/products/product-1/gallery/image-1/1716163200000-new.webp',
      key: 'products/product-1/gallery/image-1/1716163200000-new.webp',
    };
    storage.uploadProductGalleryImage.mockResolvedValue(uploaded as never);
    repo.updateProductImage.mockRejectedValue(new Error('connection lost after commit'));
    repo.findProductImageById.mockResolvedValue({ ...image, url: uploaded.url } as never);
    uploadCompensation.removeIfUnreferenced.mockResolvedValue(false);
    await expect(service.replaceFile(product.id, image.id, {}, {
      buffer: Buffer.from('new image'), mimeType: 'image/webp', size: 12,
    })).rejects.toMatchObject({ status: 500 });
    expect(uploadCompensation.removeIfUnreferenced).toHaveBeenCalledWith(uploaded, {
      kind: 'product-gallery', productId: product.id, imageId: image.id,
    });
    expect(repo.deleteProductImage).not.toHaveBeenCalled();
  });

  it('preserves the uploaded gallery object if the post-failure state cannot be read', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    const uploaded = {
      url: 'https://cdn.test/products/product-1/gallery/image-1/1716163200000-new.webp',
      key: 'products/product-1/gallery/image-1/1716163200000-new.webp',
    };
    storage.uploadProductGalleryImage.mockResolvedValue(uploaded as never);
    repo.updateProductImage.mockRejectedValue(new Error('write result unknown'));
    repo.findProductImageById.mockResolvedValue(image as never);
    uploadCompensation.removeIfUnreferenced.mockResolvedValue(false);
    await expect(service.replaceFile(product.id, image.id, {}, {
      buffer: Buffer.from('new image'), mimeType: 'image/webp', size: 12,
    })).rejects.toMatchObject({ status: 500 });
    expect(uploadCompensation.removeIfUnreferenced).toHaveBeenCalledWith(uploaded, {
      kind: 'product-gallery', productId: product.id, imageId: image.id,
    });
  });

  it('keeps the established server error when gallery replacement fails', async () => {
    const service = new ProductGalleryService(repo, access, storage, uploadCompensation);
    storage.uploadProductGalleryImage.mockRejectedValue(new Error('storage down'));
    await expect(service.replaceFile(product.id, image.id, {}, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500 });
  });

  it('uploads the main image separately and preserves its error contract', async () => {
    const service = new ProductImagesService(repo, access, storage, uploadCompensation);
    storage.uploadProductImage.mockResolvedValue({ url: 'https://cdn.test/main.webp' } as never);
    repo.updateImageUrl.mockResolvedValue({ ...product, imageUrl: 'https://cdn.test/main.webp' } as never);
    const result = await service.upload(product.id, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    });
    expect(storage.uploadProductImage).toHaveBeenCalled();
    expect(result.imageUrl).toBe('https://cdn.test/main.webp');
    storage.uploadProductImage.mockRejectedValue(new Error('storage down'));
    await expect(service.upload(product.id, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500 });
  });

  it('normalizes guide content and preserves association checks on updates', async () => {
    const service = new ProductGuideSectionsService(repo, access, storage, uploadCompensation);
    repo.createProductGuideSection.mockResolvedValue(guide as never);
    await service.create(product.id, {
      kind: guide.kind, title: ' Título ', body: ' Texto ', bullets: [' dica ', ' '],
    });
    expect(repo.createProductGuideSection).toHaveBeenCalledWith(product.id, expect.objectContaining({
      title: 'Título', body: 'Texto', bullets: ['dica'],
    }));
    repo.findProductGuideSectionById.mockResolvedValue({ ...guide, productId: 'other' } as never);
    await expect(service.update(product.id, guide.id, { title: 'Alterado' })).rejects.toMatchObject({ status: 404 });
  });

  it('keeps the guide image alternative text while uploading and clears it on removal', async () => {
    const service = new ProductGuideSectionsService(repo, access, storage, uploadCompensation);
    storage.uploadProductGuideSectionImage.mockResolvedValue({ url: 'https://cdn.test/guide.webp' } as never);
    repo.updateProductGuideSectionImage.mockResolvedValue({ ...guide, imageUrl: 'https://cdn.test/guide.webp' } as never);
    await service.uploadImage(product.id, guide.id, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    });
    expect(repo.updateProductGuideSectionImage).toHaveBeenCalledWith(guide.id, 'https://cdn.test/guide.webp', guide.imageAlt);
    expect(uploadCompensation.removeIfUnreferenced).not.toHaveBeenCalled();
    await service.removeImage(product.id, guide.id);
    expect(repo.updateProductGuideSectionImage).toHaveBeenLastCalledWith(guide.id, null, null);
  });

  it('compensates a guide-image upload when section persistence fails', async () => {
    const service = new ProductGuideSectionsService(repo, access, storage, uploadCompensation);
    const uploaded = {
      url: 'https://cdn.test/products/product-1/guide-sections/guide-1/1716163200000-a1b2c3d4.webp',
      key: 'products/product-1/guide-sections/guide-1/1716163200000-a1b2c3d4.webp',
    };
    const error = new Error('database write failed');
    storage.uploadProductGuideSectionImage.mockResolvedValue(uploaded as never);
    repo.updateProductGuideSectionImage.mockRejectedValue(error);
    await expect(service.uploadImage(product.id, guide.id, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500, cause: error });
    expect(uploadCompensation.removeIfUnreferenced).toHaveBeenCalledWith(uploaded, {
      kind: 'product-guide', productId: product.id, sectionId: guide.id,
    });
  });
});
