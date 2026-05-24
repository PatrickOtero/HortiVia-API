import {
  ProductCategory,
  ProductGuideSectionKind,
  ProductImageKind,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { StorageService } from '../storage/storage.service';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const baseProduct = {
    id: 'product-1',
    name: 'Abacate',
    slug: 'abacate',
    category: ProductCategory.FRUIT,
    shortDescription: 'Vai bem em torradas, vitaminas e cremes.',
    description: 'Quando amadurece, ganha textura cremosa e combina com preparos doces ou salgados.',
    imageUrl: null,
    benefits: ['Rende bem em lanches e acompanhamentos'],
    howToChoose: ['Prefira os mais firmes.'],
    howToStore: ['Guarde em local fresco.'],
    usageTips: ['Use em vitaminas.'],
    nutrients: [{ label: 'Destaque', value: 'Gorduras boas' }],
    isActive: true,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
    images: [],
    guideSections: [],
  };

  const baseImage = {
    id: 'image-1',
    productId: baseProduct.id,
    url: 'https://cdn.hortivia.com/products/abacate/whole.webp',
    alt: 'Abacate inteiro',
    caption: 'Fruto inteiro',
    kind: ProductImageKind.WHOLE,
    sortOrder: 0,
    isPrimary: false,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  };

  const baseGuideSection = {
    id: 'section-1',
    productId: baseProduct.id,
    kind: ProductGuideSectionKind.CHOOSE,
    title: 'Como escolher',
    body: 'Prefira frutos com casca íntegra.',
    imageUrl: null,
    imageAlt: null,
    imageCaption: null,
    bullets: ['Casca íntegra'],
    idealPoints: ['Leve maciez'],
    avoidPoints: ['Rachaduras'],
    sortOrder: 0,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  };

  const productsRepository = {
    findManyWithPagination: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateImageUrl: jest.fn(),
    deactivate: jest.fn(),
    findProductImageById: jest.fn(),
    createProductImage: jest.fn(),
    updateProductImage: jest.fn(),
    clearPrimaryProductImages: jest.fn(),
    deleteProductImage: jest.fn(),
    findProductGuideSectionById: jest.fn(),
    createProductGuideSection: jest.fn(),
    updateProductGuideSection: jest.fn(),
    deleteProductGuideSection: jest.fn(),
  } as unknown as jest.Mocked<ProductsRepository>;

  const storageService = {
    uploadProductImage: jest.fn(),
  } as unknown as jest.Mocked<Pick<StorageService, 'uploadProductImage'>>;

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(
      productsRepository as unknown as ProductsRepository,
      storageService as unknown as StorageService,
    );
  });

  function buildCreatedProduct(data: Prisma.ProductCreateInput) {
    return {
      ...baseProduct,
      name: data.name as string,
      slug: data.slug as string,
      category: data.category as ProductCategory,
      shortDescription: data.shortDescription as string,
      description: (data.description as string | null) ?? null,
      imageUrl: (data.imageUrl as string | null) ?? null,
      benefits: (data.benefits as string[]) ?? [],
      howToChoose: (data.howToChoose as string[]) ?? [],
      howToStore: (data.howToStore as string[]) ?? [],
      usageTips: (data.usageTips as string[]) ?? [],
      nutrients:
        (data.nutrients as { label: string; value: string }[] | undefined) ?? [],
      images: [],
      guideSections: [],
    };
  }

  it('lists products with pagination metadata', async () => {
    productsRepository.findManyWithPagination.mockResolvedValue([baseProduct]);
    productsRepository.count.mockResolvedValue(20);

    const result = await service.list({
      page: 2,
      limit: 10,
    });

    expect(productsRepository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      skip: 10,
      take: 10,
    });
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 20,
      totalPages: 2,
    });
    expect(result.data).toEqual([
      {
        id: baseProduct.id,
        name: baseProduct.name,
        slug: baseProduct.slug,
        category: baseProduct.category,
        shortDescription: baseProduct.shortDescription,
        imageUrl: baseProduct.imageUrl,
      },
    ]);
  });

  it('searches products by name', async () => {
    productsRepository.findManyWithPagination.mockResolvedValue([]);
    productsRepository.count.mockResolvedValue(0);

    await service.list({
      search: 'aba',
    });

    expect(productsRepository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isActive: true,
        name: {
          contains: 'aba',
          mode: 'insensitive',
        },
      },
      skip: 0,
      take: 10,
    });
  });

  it('filters products by category', async () => {
    productsRepository.findManyWithPagination.mockResolvedValue([]);
    productsRepository.count.mockResolvedValue(0);

    await service.list({
      category: ProductCategory.VEGETABLE,
    });

    expect(productsRepository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isActive: true,
        category: ProductCategory.VEGETABLE,
      },
      skip: 0,
      take: 10,
    });
  });

  it('returns product detail with mainImages fallback when only imageUrl exists', async () => {
    productsRepository.findById.mockResolvedValue({
      ...baseProduct,
      imageUrl: 'https://cdn.hortivia.com/products/abacate/cover.webp',
    });

    const result = await service.getById(baseProduct.id);

    expect(result.mainImages).toEqual([
      {
        id: `${baseProduct.id}-legacy-image`,
        url: 'https://cdn.hortivia.com/products/abacate/cover.webp',
        alt: baseProduct.name,
        caption: null,
        kind: ProductImageKind.HERO,
        sortOrder: 0,
        isPrimary: true,
      },
    ]);
    expect(result.guideSections).toEqual([]);
  });

  it('returns product detail with real mainImages and ordered guideSections', async () => {
    productsRepository.findById.mockResolvedValue({
      ...baseProduct,
      imageUrl: 'https://cdn.hortivia.com/products/abacate/cover.webp',
      images: [
        {
          ...baseImage,
          id: 'image-2',
          kind: ProductImageKind.CUT,
          sortOrder: 1,
        },
        {
          ...baseImage,
          id: 'image-1',
          kind: ProductImageKind.HERO,
          sortOrder: 0,
          isPrimary: true,
        },
      ],
      guideSections: [
        {
          ...baseGuideSection,
          id: 'section-2',
          kind: ProductGuideSectionKind.STORE,
          title: 'Como conservar',
          sortOrder: 1,
        },
        {
          ...baseGuideSection,
          id: 'section-1',
          kind: ProductGuideSectionKind.CHOOSE,
          title: 'Como escolher',
          sortOrder: 0,
        },
      ],
    });

    const result = await service.getById(baseProduct.id);

    expect(result.mainImages).toEqual([
      {
        id: 'image-2',
        url: baseImage.url,
        alt: baseImage.alt,
        caption: baseImage.caption,
        kind: ProductImageKind.CUT,
        sortOrder: 1,
        isPrimary: false,
      },
      {
        id: 'image-1',
        url: baseImage.url,
        alt: baseImage.alt,
        caption: baseImage.caption,
        kind: ProductImageKind.HERO,
        sortOrder: 0,
        isPrimary: true,
      },
    ]);
    expect(result.guideSections).toEqual([
      {
        id: 'section-2',
        kind: ProductGuideSectionKind.STORE,
        title: 'Como conservar',
        body: baseGuideSection.body,
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
        bullets: ['Casca íntegra'],
        idealPoints: ['Leve maciez'],
        avoidPoints: ['Rachaduras'],
        sortOrder: 1,
      },
      {
        id: 'section-1',
        kind: ProductGuideSectionKind.CHOOSE,
        title: 'Como escolher',
        body: baseGuideSection.body,
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
        bullets: ['Casca íntegra'],
        idealPoints: ['Leve maciez'],
        avoidPoints: ['Rachaduras'],
        sortOrder: 0,
      },
    ]);
  });

  it('throws not found when the product does not exist', async () => {
    productsRepository.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toMatchObject({
      response: {
        message: 'Produto não encontrado.',
      },
    });
  });

  it('creates a product with a generated slug', async () => {
    productsRepository.findBySlug.mockResolvedValue(null);
    productsRepository.create.mockImplementation(async data =>
      buildCreatedProduct(data),
    );

    const result = await service.create({
      name: 'Abacate',
      category: ProductCategory.FRUIT,
      shortDescription: 'Rico em gorduras boas.',
      nutrients: [{ label: 'Vitamina principal', value: 'Vitamina C' }],
    });

    expect(productsRepository.findBySlug).toHaveBeenCalledWith('abacate');
    expect(productsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'abacate',
      }),
    );
    expect(result.slug).toBe('abacate');
  });

  it('appends a numeric suffix when the slug already exists', async () => {
    productsRepository.findBySlug
      .mockResolvedValueOnce(baseProduct)
      .mockResolvedValueOnce(null);
    productsRepository.create.mockImplementation(async data =>
      buildCreatedProduct(data),
    );

    const result = await service.create({
      name: 'Abacate',
      category: ProductCategory.FRUIT,
      shortDescription: 'Rico em gorduras boas.',
    });

    expect(productsRepository.findBySlug).toHaveBeenNthCalledWith(1, 'abacate');
    expect(productsRepository.findBySlug).toHaveBeenNthCalledWith(2, 'abacate-2');
    expect(result.slug).toBe('abacate-2');
  });

  it('creates a product image and clears previous primary images when needed', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);
    productsRepository.createProductImage.mockResolvedValue({
      ...baseImage,
      isPrimary: true,
    });

    const result = await service.createImage(baseProduct.id, {
      url: baseImage.url,
      kind: ProductImageKind.HERO,
      isPrimary: true,
    });

    expect(productsRepository.createProductImage).toHaveBeenCalledWith(
      baseProduct.id,
      expect.objectContaining({
        productId: baseProduct.id,
        url: baseImage.url,
        kind: ProductImageKind.HERO,
        isPrimary: true,
      }),
    );
    expect(productsRepository.clearPrimaryProductImages).toHaveBeenCalledWith(
      baseProduct.id,
      baseImage.id,
    );
    expect(result.isPrimary).toBe(true);
  });

  it('updates a product image and clears previous primary images when setting a new primary', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);
    productsRepository.findProductImageById.mockResolvedValue(baseImage);
    productsRepository.updateProductImage.mockResolvedValue({
      ...baseImage,
      caption: 'Novo destaque',
      isPrimary: true,
    });

    const result = await service.updateImage(baseProduct.id, baseImage.id, {
      caption: 'Novo destaque',
      isPrimary: true,
    });

    expect(productsRepository.updateProductImage).toHaveBeenCalledWith(
      baseImage.id,
      expect.objectContaining({
        caption: 'Novo destaque',
        isPrimary: true,
      }),
    );
    expect(productsRepository.clearPrimaryProductImages).toHaveBeenCalledWith(
      baseProduct.id,
      baseImage.id,
    );
    expect(result.caption).toBe('Novo destaque');
  });

  it('deletes only the requested product image', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);
    productsRepository.findProductImageById.mockResolvedValue(baseImage);

    const result = await service.deleteImage(baseProduct.id, baseImage.id);

    expect(productsRepository.deleteProductImage).toHaveBeenCalledWith(baseImage.id);
    expect(result).toEqual({
      message: 'Imagem removida.',
    });
  });

  it('creates a guide section for the product', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);
    productsRepository.createProductGuideSection.mockResolvedValue(baseGuideSection);

    const result = await service.createGuideSection(baseProduct.id, {
      kind: ProductGuideSectionKind.CHOOSE,
      title: 'Como escolher',
      body: 'Prefira frutos firmes.',
      bullets: ['Casca íntegra'],
      idealPoints: ['Firmeza'],
      avoidPoints: ['Rachaduras'],
      sortOrder: 0,
    });

    expect(productsRepository.createProductGuideSection).toHaveBeenCalledWith(
      baseProduct.id,
      expect.objectContaining({
        productId: baseProduct.id,
        kind: ProductGuideSectionKind.CHOOSE,
        title: 'Como escolher',
      }),
    );
    expect(result.kind).toBe(ProductGuideSectionKind.CHOOSE);
  });

  it('deletes only the requested guide section', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);
    productsRepository.findProductGuideSectionById.mockResolvedValue(
      baseGuideSection,
    );

    const result = await service.deleteGuideSection(
      baseProduct.id,
      baseGuideSection.id,
    );

    expect(productsRepository.deleteProductGuideSection).toHaveBeenCalledWith(
      baseGuideSection.id,
    );
    expect(result).toEqual({
      message: 'Seção removida.',
    });
  });

  it('rejects product image upload without a file', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);

    await expect(service.uploadImage(baseProduct.id)).rejects.toMatchObject({
      response: {
        message: 'Envie uma imagem válida.',
      },
    });
  });

  it('rejects product image upload with an invalid mime type', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);

    await expect(
      service.uploadImage(baseProduct.id, {
        buffer: Buffer.from('fake-image'),
        mimeType: 'application/pdf',
        size: 256,
        originalName: 'product.pdf',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Formato de imagem não permitido.',
      },
    });
  });

  it('uploads product image and returns the updated product detail', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);
    storageService.uploadProductImage.mockResolvedValue({
      url: 'https://cdn.hortivia.com/products/product-1/cover.webp',
    });
    productsRepository.updateImageUrl.mockResolvedValue({
      ...baseProduct,
      imageUrl: 'https://cdn.hortivia.com/products/product-1/cover.webp',
    });

    const result = await service.uploadImage(baseProduct.id, {
      buffer: Buffer.from('fake-image'),
      mimeType: 'image/webp',
      size: 256,
      originalName: 'cover.webp',
    });

    expect(storageService.uploadProductImage).toHaveBeenCalledWith(baseProduct.id, {
      buffer: Buffer.from('fake-image'),
      mimeType: 'image/webp',
      size: 256,
      originalName: 'cover.webp',
    });
    expect(productsRepository.updateImageUrl).toHaveBeenCalledWith(
      baseProduct.id,
      'https://cdn.hortivia.com/products/product-1/cover.webp',
    );
    expect(result.imageUrl).toBe('https://cdn.hortivia.com/products/product-1/cover.webp');
    expect(result.mainImages).toEqual([
      {
        id: `${baseProduct.id}-legacy-image`,
        url: 'https://cdn.hortivia.com/products/product-1/cover.webp',
        alt: baseProduct.name,
        caption: null,
        kind: ProductImageKind.HERO,
        sortOrder: 0,
        isPrimary: true,
      },
    ]);
  });
});
