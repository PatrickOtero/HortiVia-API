import { ArticleCategory } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { StorageService } from '../storage/storage.service';
import { ArticlesRepository } from './articles.repository';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  const baseArticle = {
    id: 'article-1',
    title: 'Como escolher um abacate no ponto certo',
    slug: 'como-escolher-um-abacate-no-ponto-certo',
    summary: 'Aprenda sinais simples para identificar maturacao.',
    content:
      'Aprenda a observar a casca, a textura e o aroma antes de levar o abacate para casa.',
    category: ArticleCategory.TIPS,
    imageUrl: null,
    tags: ['abacate', 'compra'],
    authorId: 'user-1',
    author: {
      id: 'user-1',
      name: 'Equipe HortiVia',
      avatarUrl: null,
    },
    publishedAt: new Date('2026-05-20T10:00:00.000Z'),
    isPublished: true,
    createdAt: new Date('2026-05-20T09:00:00.000Z'),
    updatedAt: new Date('2026-05-20T09:00:00.000Z'),
  };

  const adminUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'admin@hortivia.local',
    role: 'ADMIN',
  };

  const articlesRepository = {
    findManyWithPagination: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateImageUrl: jest.fn(),
    unpublish: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      ArticlesRepository,
      | 'findManyWithPagination'
      | 'count'
      | 'findById'
      | 'findBySlug'
      | 'create'
      | 'update'
      | 'updateImageUrl'
      | 'unpublish'
    >
  >;

  const storageService = {
    uploadArticleImage: jest.fn(),
  } as unknown as jest.Mocked<Pick<StorageService, 'uploadArticleImage'>>;

  let service: ArticlesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ArticlesService(
      articlesRepository as unknown as ArticlesRepository,
      storageService as unknown as StorageService,
    );
  });

  function buildCreatedArticle(data: Prisma.ArticleCreateInput) {
    return {
      ...baseArticle,
      title: data.title as string,
      slug: data.slug as string,
      summary: data.summary as string,
      content: data.content as string,
      category: data.category as ArticleCategory,
      imageUrl: (data.imageUrl as string | null) ?? null,
      tags: (data.tags as string[]) ?? [],
      isPublished: (data.isPublished as boolean | undefined) ?? false,
      publishedAt: (data.publishedAt as Date | null | undefined) ?? null,
    };
  }

  it('lists articles with pagination metadata', async () => {
    articlesRepository.findManyWithPagination.mockResolvedValue([baseArticle]);
    articlesRepository.count.mockResolvedValue(20);

    const result = await service.list({
      page: 1,
      limit: 10,
    });

    expect(articlesRepository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isPublished: true,
      },
      skip: 0,
      take: 10,
    });
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 20,
      totalPages: 2,
    });
    expect(result.data[0]).toMatchObject({
      id: baseArticle.id,
      title: baseArticle.title,
      slug: baseArticle.slug,
      category: baseArticle.category,
      author: baseArticle.author,
    });
  });

  it('searches articles by title and summary', async () => {
    articlesRepository.findManyWithPagination.mockResolvedValue([]);
    articlesRepository.count.mockResolvedValue(0);

    await service.list({
      search: 'abacate',
    });

    expect(articlesRepository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isPublished: true,
        OR: [
          {
            title: {
              contains: 'abacate',
              mode: 'insensitive',
            },
          },
          {
            summary: {
              contains: 'abacate',
              mode: 'insensitive',
            },
          },
        ],
      },
      skip: 0,
      take: 10,
    });
  });

  it('filters articles by category', async () => {
    articlesRepository.findManyWithPagination.mockResolvedValue([]);
    articlesRepository.count.mockResolvedValue(0);

    await service.list({
      category: ArticleCategory.STORAGE,
    });

    expect(articlesRepository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isPublished: true,
        category: ArticleCategory.STORAGE,
      },
      skip: 0,
      take: 10,
    });
  });

  it('returns article detail by id', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);

    const result = await service.getById(baseArticle.id);

    expect(articlesRepository.findById).toHaveBeenCalledWith(baseArticle.id);
    expect(result).toMatchObject({
      id: baseArticle.id,
      title: baseArticle.title,
      slug: baseArticle.slug,
      author: baseArticle.author,
      readingTimeMinutes: 1,
    });
  });

  it('throws not found when the article does not exist', async () => {
    articlesRepository.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toMatchObject({
      response: {
        message: 'Artigo não encontrado.',
      },
    });
  });

  it('creates an article with a generated slug', async () => {
    articlesRepository.findBySlug.mockResolvedValue(null);
    articlesRepository.create.mockImplementation(async data =>
      buildCreatedArticle(data),
    );

    const result = await service.create(
      {
        title: 'Como conservar folhas por mais tempo',
        summary: 'Dicas simples para folhas firmes.',
        content: 'Guarde as folhas secas em pote fechado para reduzir umidade.',
        category: ArticleCategory.STORAGE,
        isPublished: true,
      },
      adminUser,
    );

    expect(articlesRepository.findBySlug).toHaveBeenCalledWith(
      'como-conservar-folhas-por-mais-tempo',
    );
    expect(articlesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'como-conservar-folhas-por-mais-tempo',
        author: {
          connect: {
            id: adminUser.userId,
          },
        },
      }),
    );
    expect(result.slug).toBe('como-conservar-folhas-por-mais-tempo');
    expect(result.readingTimeMinutes).toBe(1);
  });

  it('appends a numeric suffix when the slug already exists', async () => {
    articlesRepository.findBySlug
      .mockResolvedValueOnce(baseArticle)
      .mockResolvedValueOnce(null);
    articlesRepository.create.mockImplementation(async data =>
      buildCreatedArticle(data),
    );

    const result = await service.create(
      {
        title: 'Como escolher um abacate no ponto certo',
        summary: 'Aprenda sinais simples.',
        content: 'Observe cor, textura e firmeza do fruto antes da compra.',
        category: ArticleCategory.TIPS,
      },
      adminUser,
    );

    expect(articlesRepository.findBySlug).toHaveBeenNthCalledWith(
      1,
      'como-escolher-um-abacate-no-ponto-certo',
    );
    expect(articlesRepository.findBySlug).toHaveBeenNthCalledWith(
      2,
      'como-escolher-um-abacate-no-ponto-certo-2',
    );
    expect(result.slug).toBe('como-escolher-um-abacate-no-ponto-certo-2');
  });

  it('sets publishedAt when publishing without a date', async () => {
    articlesRepository.findBySlug.mockResolvedValue(null);
    articlesRepository.create.mockImplementation(async data =>
      buildCreatedArticle(data),
    );

    await service.create(
      {
        title: 'Frutas da estação',
        summary: 'Vale observar a safra.',
        content: 'Produtos da estação costumam ter melhor sabor e preço.',
        category: ArticleCategory.SEASONALITY,
        isPublished: true,
      },
      adminUser,
    );

    expect(articlesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPublished: true,
        publishedAt: expect.any(Date),
      }),
    );
  });

  it('rejects article image upload without a file', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);

    await expect(service.uploadImage(baseArticle.id)).rejects.toMatchObject({
      response: {
        message: 'Envie uma imagem válida.',
      },
    });
  });

  it('rejects article image upload with an invalid mime type', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);

    await expect(
      service.uploadImage(baseArticle.id, {
        buffer: Buffer.from('fake-image'),
        mimeType: 'application/pdf',
        size: 256,
        originalName: 'article.pdf',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Formato de imagem não permitido.',
      },
    });
  });

  it('uploads article image and returns the updated article detail', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    storageService.uploadArticleImage.mockResolvedValue({
      url: 'https://cdn.hortivia.com/articles/article-1/cover.webp',
    });
    articlesRepository.updateImageUrl.mockResolvedValue({
      ...baseArticle,
      imageUrl: 'https://cdn.hortivia.com/articles/article-1/cover.webp',
    });

    const result = await service.uploadImage(baseArticle.id, {
      buffer: Buffer.from('fake-image'),
      mimeType: 'image/webp',
      size: 256,
      originalName: 'cover.webp',
    });

    expect(storageService.uploadArticleImage).toHaveBeenCalledWith(baseArticle.id, {
      buffer: Buffer.from('fake-image'),
      mimeType: 'image/webp',
      size: 256,
      originalName: 'cover.webp',
    });
    expect(articlesRepository.updateImageUrl).toHaveBeenCalledWith(
      baseArticle.id,
      'https://cdn.hortivia.com/articles/article-1/cover.webp',
    );
    expect(result.imageUrl).toBe('https://cdn.hortivia.com/articles/article-1/cover.webp');
  });
});
