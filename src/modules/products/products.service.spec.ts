import { ProductCategory } from '../../generated/prisma/enums';
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
    shortDescription: 'Rico em gorduras boas.',
    description: 'Fruta cremosa e versatil.',
    imageUrl: null,
    benefits: ['Energia'],
    howToChoose: ['Prefira os mais firmes.'],
    howToStore: ['Guarde em local fresco.'],
    usageTips: ['Use em vitaminas.'],
    nutrients: [{ label: 'Vitamina principal', value: 'Vitamina C' }],
    isActive: true,
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
  } as unknown as jest.Mocked<
    Pick<
      ProductsRepository,
      | 'findManyWithPagination'
      | 'count'
      | 'findById'
      | 'findBySlug'
      | 'create'
      | 'update'
      | 'updateImageUrl'
      | 'deactivate'
    >
  >;

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
      isActive: true,
      createdAt: baseProduct.createdAt,
      updatedAt: baseProduct.updatedAt,
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

  it('returns product detail by id', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);

    const result = await service.getById(baseProduct.id);

    expect(productsRepository.findById).toHaveBeenCalledWith(baseProduct.id);
    expect(result).toEqual({
      id: baseProduct.id,
      name: baseProduct.name,
      slug: baseProduct.slug,
      category: baseProduct.category,
      shortDescription: baseProduct.shortDescription,
      description: baseProduct.description,
      imageUrl: baseProduct.imageUrl,
      benefits: baseProduct.benefits,
      howToChoose: baseProduct.howToChoose,
      howToStore: baseProduct.howToStore,
      usageTips: baseProduct.usageTips,
      nutrients: baseProduct.nutrients,
      createdAt: baseProduct.createdAt.toISOString(),
      updatedAt: baseProduct.updatedAt.toISOString(),
    });
  });

  it('throws not found when the product does not exist', async () => {
    productsRepository.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toMatchObject({
      response: {
        message: 'Produto nao encontrado.',
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

  it('rejects product image upload without a file', async () => {
    productsRepository.findById.mockResolvedValue(baseProduct);

    await expect(service.uploadImage(baseProduct.id)).rejects.toMatchObject({
      response: {
        message: 'Envie uma imagem valida.',
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
        message: 'Formato de imagem nao permitido.',
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
  });
});
