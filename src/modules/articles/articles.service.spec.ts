import { ArticleCategory, ProductCategory } from '../../generated/prisma/enums';
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
    subtitle: 'Sinais diretos para acertar na compra.',
    summary: 'Aprenda sinais simples para identificar maturacao.',
    content:
      'Aprenda a observar a casca, a textura e o aroma antes de levar o abacate para casa.',
    category: ArticleCategory.TIPS,
    imageUrl: null,
    coverImageUrl: null,
    coverImageAlt: null,
    readingTimeMinutes: null,
    featured: false,
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
    blocks: [],
    productRelations: [],
    _count: {
      reactions: 0,
    },
  };

  const baseRelatedProduct = {
    id: 'product-1',
    name: 'Abacate',
    slug: 'abacate',
    category: ProductCategory.FRUIT,
    shortDescription: 'Vai bem em torradas, vitaminas e cremes.',
    imageUrl: null,
    description: null,
    benefits: [],
    howToChoose: [],
    howToStore: [],
    usageTips: [],
    nutrients: [],
    isActive: true,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
    images: [],
    guideSections: [],
    articleRelations: [],
    favorites: [],
  };

  const adminUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'admin@hortivia.local',
    role: 'ADMIN',
  };

  const regularUser: AuthenticatedUser = {
    userId: 'user-2',
    email: 'user@hortivia.local',
    role: 'USER',
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
    createBlock: jest.fn(),
    findBlockById: jest.fn(),
    updateBlock: jest.fn(),
    deleteBlock: jest.fn(),
    findSavedArticleByUserAndArticle: jest.fn(),
    createSavedArticle: jest.fn(),
    deleteSavedArticle: jest.fn(),
    listSavedArticlesByUser: jest.fn(),
    countSavedArticlesByUser: jest.fn(),
    getSavedArticleIdsForUser: jest.fn(),
    findReaction: jest.fn(),
    createReaction: jest.fn(),
    deleteReaction: jest.fn(),
    countReactions: jest.fn(),
    getReactionArticleIdsForUser: jest.fn(),
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
      | 'createBlock'
      | 'findBlockById'
      | 'updateBlock'
      | 'deleteBlock'
      | 'findSavedArticleByUserAndArticle'
      | 'createSavedArticle'
      | 'deleteSavedArticle'
      | 'listSavedArticlesByUser'
      | 'countSavedArticlesByUser'
      | 'getSavedArticleIdsForUser'
      | 'findReaction'
      | 'createReaction'
      | 'deleteReaction'
      | 'countReactions'
      | 'getReactionArticleIdsForUser'
    >
  >;

  const storageService = {
    uploadArticleImage: jest.fn(),
    uploadArticleBlockImage: jest.fn(),
    createArticleBlockImageUploadUrl: jest.fn(),
    isManagedPublicUrl: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      StorageService,
      | 'uploadArticleImage'
      | 'uploadArticleBlockImage'
      | 'createArticleBlockImageUploadUrl'
      | 'isManagedPublicUrl'
    >
  >;

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
      subtitle: (data.subtitle as string | null | undefined) ?? null,
      summary: data.summary as string,
      content: data.content as string,
      category: data.category as ArticleCategory,
      imageUrl: (data.imageUrl as string | null) ?? null,
      coverImageUrl: (data.coverImageUrl as string | null | undefined) ?? null,
      coverImageAlt: (data.coverImageAlt as string | null | undefined) ?? null,
      readingTimeMinutes:
        (data.readingTimeMinutes as number | null | undefined) ?? null,
      featured: (data.featured as boolean | undefined) ?? false,
      tags: (data.tags as string[]) ?? [],
      isPublished: (data.isPublished as boolean | undefined) ?? false,
      publishedAt: (data.publishedAt as Date | null | undefined) ?? null,
      blocks: [],
      _count: {
        reactions: 0,
      },
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
      reactionsCount: 0,
      isReacted: false,
      isSaved: false,
    });
    expect(result.data[0]).not.toHaveProperty('relatedProducts');
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

  it('includes isReacted in the article feed for an authenticated user', async () => {
    articlesRepository.findManyWithPagination.mockResolvedValue([baseArticle]);
    articlesRepository.count.mockResolvedValue(1);
    articlesRepository.getReactionArticleIdsForUser.mockResolvedValue([
      baseArticle.id,
    ]);

    const result = await service.list(
      {
        page: 1,
        limit: 10,
      },
      regularUser,
    );

    expect(articlesRepository.getReactionArticleIdsForUser).toHaveBeenCalledWith(
      regularUser.userId,
      [baseArticle.id],
      'HELPFUL',
    );
    expect(result.data[0]).toMatchObject({
      id: baseArticle.id,
      reactionsCount: 0,
      isReacted: true,
    });
  });

  it('returns article detail by id', async () => {
    articlesRepository.findById.mockResolvedValue({
      ...baseArticle,
      blocks: [
        {
          id: 'block-1',
          articleId: baseArticle.id,
          kind: 'PARAGRAPH',
          title: null,
          body: 'Primeiro bloco.',
          imageUrl: 'https://cdn.hortivia.com/articles/article-1/blocks/block-1/intro.webp',
          imageAlt: 'Folhas verdes secando sobre pano limpo',
          imageCaption: 'A secagem correta ajuda a conservar melhor.',
          items: null,
          sortOrder: 0,
          createdAt: new Date('2026-05-20T11:00:00.000Z'),
          updatedAt: new Date('2026-05-20T11:00:00.000Z'),
        },
      ],
      productRelations: [
        {
          id: 'relation-1',
          productId: baseRelatedProduct.id,
          articleId: baseArticle.id,
          sortOrder: 0,
          createdAt: new Date('2026-05-20T11:00:00.000Z'),
          product: baseRelatedProduct,
        },
      ],
    });

    const result = await service.getById(baseArticle.id);

    expect(articlesRepository.findById).toHaveBeenCalledWith(baseArticle.id, false);
    expect(result).toMatchObject({
      id: baseArticle.id,
      title: baseArticle.title,
      slug: baseArticle.slug,
      author: baseArticle.author,
      readingTimeMinutes: 1,
      reactionsCount: 0,
      isReacted: false,
      isSaved: false,
    });
    expect(result.relatedProducts).toEqual([
      {
        id: baseRelatedProduct.id,
        name: baseRelatedProduct.name,
        slug: baseRelatedProduct.slug,
        category: baseRelatedProduct.category,
        shortDescription: baseRelatedProduct.shortDescription,
        imageUrl: baseRelatedProduct.imageUrl,
      },
    ]);
    expect(result.blocks).toEqual([
      expect.objectContaining({
        id: 'block-1',
        articleId: baseArticle.id,
        kind: 'PARAGRAPH',
        body: 'Primeiro bloco.',
        imageUrl:
          'https://cdn.hortivia.com/articles/article-1/blocks/block-1/intro.webp',
        imageAlt: 'Folhas verdes secando sobre pano limpo',
        imageCaption: 'A secagem correta ajuda a conservar melhor.',
        sortOrder: 0,
        createdAt: '2026-05-20T11:00:00.000Z',
        updatedAt: '2026-05-20T11:00:00.000Z',
      }),
    ]);
  });

  it('returns unpublished article detail for admins', async () => {
    articlesRepository.findById.mockResolvedValue({
      ...baseArticle,
      isPublished: false,
      publishedAt: null,
      blocks: [],
      productRelations: [],
    });

    const result = await service.getByIdForAdmin(baseArticle.id);

    expect(articlesRepository.findById).toHaveBeenCalledWith(baseArticle.id, true);
    expect(result).toMatchObject({
      id: baseArticle.id,
      title: baseArticle.title,
      reactionsCount: 0,
      isReacted: false,
      isSaved: false,
    });
  });

  it('includes isReacted in article detail for an authenticated user', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findReaction.mockResolvedValue({
      id: 'reaction-1',
      userId: regularUser.userId,
      articleId: baseArticle.id,
      type: 'HELPFUL',
      createdAt: new Date('2026-05-27T12:00:00.000Z'),
    } as never);

    const result = await service.getById(baseArticle.id, regularUser);

    expect(articlesRepository.findReaction).toHaveBeenCalledWith(
      regularUser.userId,
      baseArticle.id,
      'HELPFUL',
    );
    expect(result.isReacted).toBe(true);
    expect(result.reactionsCount).toBe(0);
  });

  it('returns blocks ordered by sortOrder in article detail', async () => {
    articlesRepository.findById.mockResolvedValue({
      ...baseArticle,
      blocks: [
        {
          id: 'block-2',
          articleId: baseArticle.id,
          kind: 'CHECKLIST',
          title: 'Checklist',
          body: null,
          imageUrl: null,
          imageAlt: null,
          imageCaption: null,
          items: ['item 1'],
          sortOrder: 1,
          createdAt: new Date('2026-05-20T12:00:00.000Z'),
          updatedAt: new Date('2026-05-20T12:00:00.000Z'),
        },
        {
          id: 'block-1',
          articleId: baseArticle.id,
          kind: 'PARAGRAPH',
          title: null,
          body: 'Introdução.',
          imageUrl: null,
          imageAlt: null,
          imageCaption: null,
          items: null,
          sortOrder: 0,
          createdAt: new Date('2026-05-20T11:00:00.000Z'),
          updatedAt: new Date('2026-05-20T11:00:00.000Z'),
        },
      ],
      productRelations: [],
    });

    const result = await service.getById(baseArticle.id);

    expect(result.blocks.map(block => block.sortOrder)).toEqual([0, 1]);
    expect(result.blocks[0]).toEqual(
      expect.objectContaining({
        id: 'block-1',
        kind: 'PARAGRAPH',
      }),
    );
  });

  it('throws not found when the article does not exist', async () => {
    articlesRepository.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toMatchObject({
      response: {
        message: 'Artigo não encontrado.',
      },
    });
  });

  it('saves an article idempotently', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findSavedArticleByUserAndArticle.mockResolvedValue(null);

    const result = await service.saveArticle('user-1', baseArticle.id);

    expect(articlesRepository.findSavedArticleByUserAndArticle).toHaveBeenCalledWith(
      'user-1',
      baseArticle.id,
    );
    expect(articlesRepository.createSavedArticle).toHaveBeenCalledWith(
      'user-1',
      baseArticle.id,
    );
    expect(result).toEqual({
      message: 'Artigo salvo.',
    });
  });

  it('creates an article reaction idempotently', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findReaction.mockResolvedValue(null);
    articlesRepository.countReactions.mockResolvedValue(12);

    const result = await service.reactToArticle(baseArticle.id, regularUser);

    expect(articlesRepository.createReaction).toHaveBeenCalledWith(
      regularUser.userId,
      baseArticle.id,
      'HELPFUL',
    );
    expect(result).toEqual({
      message: 'Marcado como útil.',
      isReacted: true,
      reactionsCount: 12,
    });
  });

  it('does not create duplicate article reactions', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findReaction.mockResolvedValue({
      id: 'reaction-1',
      userId: regularUser.userId,
      articleId: baseArticle.id,
      type: 'HELPFUL',
      createdAt: new Date('2026-05-27T12:00:00.000Z'),
    } as never);
    articlesRepository.countReactions.mockResolvedValue(12);

    const result = await service.reactToArticle(baseArticle.id, regularUser);

    expect(articlesRepository.createReaction).not.toHaveBeenCalled();
    expect(result.isReacted).toBe(true);
    expect(result.reactionsCount).toBe(12);
  });

  it('removes an article reaction idempotently', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findReaction.mockResolvedValue({
      id: 'reaction-1',
      userId: regularUser.userId,
      articleId: baseArticle.id,
      type: 'HELPFUL',
      createdAt: new Date('2026-05-27T12:00:00.000Z'),
    } as never);
    articlesRepository.countReactions.mockResolvedValue(11);

    const result = await service.removeReactionFromArticle(
      baseArticle.id,
      regularUser,
    );

    expect(articlesRepository.deleteReaction).toHaveBeenCalledWith(
      regularUser.userId,
      baseArticle.id,
      'HELPFUL',
    );
    expect(result).toEqual({
      message: 'Reação removida.',
      isReacted: false,
      reactionsCount: 11,
    });
  });

  it('does not fail when removing a missing article reaction', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findReaction.mockResolvedValue(null);
    articlesRepository.countReactions.mockResolvedValue(0);

    const result = await service.removeReactionFromArticle(
      baseArticle.id,
      regularUser,
    );

    expect(articlesRepository.deleteReaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Reação removida.',
      isReacted: false,
      reactionsCount: 0,
    });
  });

  it('returns not found when reacting to an unknown article', async () => {
    articlesRepository.findById.mockResolvedValue(null);

    await expect(
      service.reactToArticle('missing-article', regularUser),
    ).rejects.toMatchObject({
      response: {
        message: 'Artigo não encontrado.',
      },
    });
  });

  it('does not create duplicate saved articles', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findSavedArticleByUserAndArticle.mockResolvedValue({
      id: 'saved-1',
      userId: 'user-1',
      articleId: baseArticle.id,
      createdAt: new Date('2026-05-26T00:00:00.000Z'),
    });

    await service.saveArticle('user-1', baseArticle.id);

    expect(articlesRepository.createSavedArticle).not.toHaveBeenCalled();
  });

  it('removes a saved article idempotently', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findSavedArticleByUserAndArticle.mockResolvedValue({
      id: 'saved-1',
      userId: 'user-1',
      articleId: baseArticle.id,
      createdAt: new Date('2026-05-26T00:00:00.000Z'),
    });

    const result = await service.unsaveArticle('user-1', baseArticle.id);

    expect(articlesRepository.deleteSavedArticle).toHaveBeenCalledWith(
      'user-1',
      baseArticle.id,
    );
    expect(result).toEqual({
      message: 'Artigo removido das leituras salvas.',
    });
  });

  it('lists saved articles with pagination metadata', async () => {
    articlesRepository.listSavedArticlesByUser.mockResolvedValue([
      {
        id: 'saved-1',
        userId: 'user-1',
        articleId: baseArticle.id,
        createdAt: new Date('2026-05-26T00:00:00.000Z'),
        article: baseArticle,
      },
    ]);
    articlesRepository.countSavedArticlesByUser.mockResolvedValue(1);

    const result = await service.listSavedArticles('user-1', {
      page: 1,
      limit: 20,
    });

    expect(articlesRepository.listSavedArticlesByUser).toHaveBeenCalledWith({
      userId: 'user-1',
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: baseArticle.id,
          title: baseArticle.title,
          isSaved: true,
        }),
      ],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
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

  it('creates an article block for an existing article', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.createBlock.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'TIP',
      title: 'Dica',
      body: 'Seque bem as folhas.',
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: ['Use papel toalha.'],
      sortOrder: 2,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    const result = await service.createBlock(baseArticle.id, {
      kind: 'TIP' as never,
      title: 'Dica',
      body: 'Seque bem as folhas.',
      items: ['Use papel toalha.'],
      sortOrder: 2,
    });

    expect(articlesRepository.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'TIP',
        sortOrder: 2,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'block-1',
        articleId: baseArticle.id,
        kind: 'TIP',
        sortOrder: 2,
      }),
    );
  });

  it('creates a presigned upload URL for an article block image', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });
    storageService.createArticleBlockImageUploadUrl.mockResolvedValue({
      key: 'articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      uploadUrl: 'https://upload.example.com',
      url: 'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
    });

    const result = await service.createBlockImageUploadUrl(baseArticle.id, 'block-1', {
      fileName: 'folhas.webp',
      contentType: 'image/webp',
      fileSize: 1024,
    });

    expect(storageService.createArticleBlockImageUploadUrl).toHaveBeenCalledWith(
      baseArticle.id,
      'block-1',
      'folhas.webp',
      'image/webp',
    );
    expect(result).toEqual({
      key: 'articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      uploadUrl: 'https://upload.example.com',
      url: 'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
    });
  });

  it('rejects article block image upload URL generation with an invalid content type', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    await expect(
      service.createBlockImageUploadUrl(baseArticle.id, 'block-1', {
        fileName: 'folhas.svg',
        contentType: 'image/svg+xml',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Formato de imagem nao permitido.',
      },
    });
  });

  it('rejects article block image upload URL generation when the article does not exist', async () => {
    articlesRepository.findById.mockResolvedValue(null);

    await expect(
      service.createBlockImageUploadUrl(baseArticle.id, 'block-1', {
        fileName: 'folhas.webp',
        contentType: 'image/webp',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Artigo não encontrado.',
      },
    });
  });

  it('rejects article block image upload URL generation with a file above the limit', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    await expect(
      service.createBlockImageUploadUrl(baseArticle.id, 'block-1', {
        fileName: 'folhas.webp',
        contentType: 'image/webp',
        fileSize: 6 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'A imagem deve ter no maximo 5 MB.',
      },
    });
  });

  it('rejects block image upload URL generation when the block belongs to another article', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: 'other-article',
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    await expect(
      service.createBlockImageUploadUrl(baseArticle.id, 'block-1', {
        fileName: 'folhas.webp',
        contentType: 'image/webp',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Bloco do artigo não encontrado.',
      },
    });
  });

  it('rejects article block image upload URL generation when the block does not exist', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue(null);

    await expect(
      service.createBlockImageUploadUrl(baseArticle.id, 'block-1', {
        fileName: 'folhas.webp',
        contentType: 'image/webp',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Bloco do artigo não encontrado.',
      },
    });
  });

  it('updates an existing article block that belongs to the article', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'PARAGRAPH',
      title: null,
      body: 'Texto antigo.',
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });
    articlesRepository.updateBlock.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'PARAGRAPH',
      title: null,
      body: 'Texto novo.',
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    const result = await service.updateBlock(baseArticle.id, 'block-1', {
      body: 'Texto novo.',
      sortOrder: 1,
    });

    expect(articlesRepository.updateBlock).toHaveBeenCalledWith(
      'block-1',
      expect.objectContaining({
        body: 'Texto novo.',
        sortOrder: 1,
      }),
    );
    expect(result.body).toBe('Texto novo.');
  });

  it('rejects block update when the block belongs to another article', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: 'other-article',
      kind: 'PARAGRAPH',
      title: null,
      body: 'Texto antigo.',
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    await expect(
      service.updateBlock(baseArticle.id, 'block-1', {
        body: 'Texto novo.',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Bloco do artigo não encontrado.',
      },
    });
  });

  it('deletes an article block that belongs to the article', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'PARAGRAPH',
      title: null,
      body: 'Texto antigo.',
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 0,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    const result = await service.deleteBlock(baseArticle.id, 'block-1');

    expect(articlesRepository.deleteBlock).toHaveBeenCalledWith('block-1');
    expect(result).toEqual({
      message: 'Bloco do artigo removido.',
    });
  });

  it('updates article block image metadata with a managed storage URL', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: 'Secagem correta',
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });
    storageService.isManagedPublicUrl.mockReturnValue(true);
    articlesRepository.updateBlock.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: 'Secagem correta',
      body: null,
      imageUrl:
        'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      imageAlt: 'Folhas verdes em uma centrifuga de salada',
      imageCaption: 'Secar bem ajuda a evitar umidade excessiva.',
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    const result = await service.updateBlockImage(baseArticle.id, 'block-1', {
      imageUrl:
        'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      imageAlt: 'Folhas verdes em uma centrifuga de salada',
      imageCaption: 'Secar bem ajuda a evitar umidade excessiva.',
    });

    expect(storageService.isManagedPublicUrl).toHaveBeenCalledWith(
      'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      'articles/article-1/blocks/block-1',
    );
    expect(articlesRepository.updateBlock).toHaveBeenCalledWith(
      'block-1',
      expect.objectContaining({
        imageUrl:
          'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
        imageAlt: 'Folhas verdes em uma centrifuga de salada',
        imageCaption: 'Secar bem ajuda a evitar umidade excessiva.',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'block-1',
        articleId: baseArticle.id,
        imageUrl:
          'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
        imageAlt: 'Folhas verdes em uma centrifuga de salada',
        imageCaption: 'Secar bem ajuda a evitar umidade excessiva.',
      }),
    );
  });

  it('uploads article block image with multipart and persists metadata', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: 'Secagem correta',
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });
    storageService.uploadArticleBlockImage.mockResolvedValue({
      url: 'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
    });
    articlesRepository.updateBlock.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: 'Secagem correta',
      body: null,
      imageUrl:
        'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      imageAlt: 'Folhas verdes na secagem',
      imageCaption: 'Secar bem evita excesso de umidade.',
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    const file = {
      buffer: Buffer.from('fake-image'),
      mimeType: 'image/webp',
      size: 512,
      originalName: 'folhas.webp',
    };

    const result = await service.uploadBlockImage(baseArticle.id, 'block-1', {
      imageAlt: 'Folhas verdes na secagem',
      imageCaption: 'Secar bem evita excesso de umidade.',
    }, file);

    expect(storageService.uploadArticleBlockImage).toHaveBeenCalledWith(
      baseArticle.id,
      'block-1',
      file,
    );
    expect(articlesRepository.updateBlock).toHaveBeenCalledWith(
      'block-1',
      expect.objectContaining({
        imageUrl:
          'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
        imageAlt: 'Folhas verdes na secagem',
        imageCaption: 'Secar bem evita excesso de umidade.',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'block-1',
        articleId: baseArticle.id,
        imageUrl:
          'https://cdn.hortivia.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
        imageAlt: 'Folhas verdes na secagem',
        imageCaption: 'Secar bem evita excesso de umidade.',
      }),
    );
  });

  it('rejects multipart article block image upload without a file', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });

    await expect(
      service.uploadBlockImage(baseArticle.id, 'block-1', {}),
    ).rejects.toMatchObject({
      response: {
        message: 'Envie uma imagem v\u00e1lida.',
      },
    });
  });

  it('rejects article block image persistence with a URL outside managed storage', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });
    storageService.isManagedPublicUrl.mockReturnValue(false);

    await expect(
      service.updateBlockImage(baseArticle.id, 'block-1', {
        imageUrl: 'https://example.com/outside.webp',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Informe uma URL de imagem valida.',
      },
    });
  });

  it('clears article block image metadata', async () => {
    articlesRepository.findById.mockResolvedValue(baseArticle);
    articlesRepository.findBlockById.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: 'https://cdn.hortivia.com/articles/article-1/blocks/block-1/existing.webp',
      imageAlt: 'Descricao antiga',
      imageCaption: 'Legenda antiga',
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T11:00:00.000Z'),
    });
    articlesRepository.updateBlock.mockResolvedValue({
      id: 'block-1',
      articleId: baseArticle.id,
      kind: 'IMAGE',
      title: null,
      body: null,
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      items: null,
      sortOrder: 1,
      createdAt: new Date('2026-05-20T11:00:00.000Z'),
      updatedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    const result = await service.removeBlockImage(baseArticle.id, 'block-1');

    expect(articlesRepository.updateBlock).toHaveBeenCalledWith('block-1', {
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'block-1',
        articleId: baseArticle.id,
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
      }),
    );
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
