import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

describe('ArticlesController', () => {
  const articlesService = {
    listComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    moderateComment: jest.fn(),
    getByIdForAdmin: jest.fn(),
    reactToArticle: jest.fn(),
    removeReactionFromArticle: jest.fn(),
    createBlockImageUploadUrl: jest.fn(),
    uploadBlockImage: jest.fn(),
    updateBlockImage: jest.fn(),
    removeBlockImage: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      ArticlesService,
      | 'listComments'
      | 'createComment'
      | 'updateComment'
      | 'deleteComment'
      | 'moderateComment'
      | 'getByIdForAdmin'
      | 'reactToArticle'
      | 'removeReactionFromArticle'
      | 'createBlockImageUploadUrl'
      | 'uploadBlockImage'
      | 'updateBlockImage'
      | 'removeBlockImage'
    >
  >;

  let controller: ArticlesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ArticlesController(
      articlesService as unknown as ArticlesService,
    );
  });

  it('protects block image upload URL generation for admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.createBlockImageUploadUrl),
    ).toEqual(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(
      Reflect.getMetadata(ROLES_KEY, controller.createBlockImageUploadUrl),
    ).toEqual([UserRole.ADMIN]);
  });

  it('protects admin article detail for admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.getByIdForAdmin),
    ).toEqual(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(Reflect.getMetadata(ROLES_KEY, controller.getByIdForAdmin)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  it('protects multipart block image upload for admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.uploadBlockImage),
    ).toEqual(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(Reflect.getMetadata(ROLES_KEY, controller.uploadBlockImage)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  it('protects block image persistence for admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.updateBlockImage),
    ).toEqual(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(Reflect.getMetadata(ROLES_KEY, controller.updateBlockImage)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  it('protects block image removal for admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.removeBlockImage),
    ).toEqual(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(Reflect.getMetadata(ROLES_KEY, controller.removeBlockImage)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  it('requires authentication to create a comment', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.createComment),
    ).toEqual(expect.arrayContaining([expect.anything()]));
  });

  it('requires authentication to update a comment', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.updateComment),
    ).toEqual(expect.arrayContaining([expect.anything()]));
  });

  it('requires authentication to delete a comment', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.deleteComment),
    ).toEqual(expect.arrayContaining([expect.anything()]));
  });

  it('protects comment moderation for admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.moderateComment),
    ).toEqual(expect.arrayContaining([expect.anything(), expect.anything()]));
    expect(Reflect.getMetadata(ROLES_KEY, controller.moderateComment)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  it('requires authentication to react to an article', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.reactToArticle),
    ).toEqual(expect.arrayContaining([expect.anything()]));
  });

  it('requires authentication to remove an article reaction', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, controller.removeReactionFromArticle),
    ).toEqual(expect.arrayContaining([expect.anything()]));
  });

  it('delegates block image upload URL generation to the service', async () => {
    const response = {
      key: 'articles/article-1/blocks/block-1/1710000000000-folhas.webp',
      uploadUrl: 'https://upload.example.com',
      url: 'https://cdn.example.com/articles/article-1/blocks/block-1/1710000000000-folhas.webp',
    };

    articlesService.createBlockImageUploadUrl.mockResolvedValue(response);

    await expect(
      controller.createBlockImageUploadUrl('article-1', 'block-1', {
        fileName: 'folhas.webp',
        contentType: 'image/webp',
        fileSize: 1234,
      }),
    ).resolves.toEqual(response);

    expect(articlesService.createBlockImageUploadUrl).toHaveBeenCalledWith(
      'article-1',
      'block-1',
      {
        fileName: 'folhas.webp',
        contentType: 'image/webp',
        fileSize: 1234,
      },
    );
  });

  it('delegates admin article detail loading to the service', async () => {
    const response = {
      id: 'article-1',
      title: 'Artigo admin',
    };

    articlesService.getByIdForAdmin.mockResolvedValue(response as never);

    await expect(controller.getByIdForAdmin('article-1')).resolves.toEqual(
      response,
    );
    expect(articlesService.getByIdForAdmin).toHaveBeenCalledWith('article-1');
  });

  it('delegates public comment listing to the service', async () => {
    const response = {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    };

    articlesService.listComments.mockResolvedValue(response as never);

    await expect(
      controller.listComments('article-1', {
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual(response);
    expect(articlesService.listComments).toHaveBeenCalledWith('article-1', {
      page: 1,
      limit: 20,
    });
  });

  it('delegates comment creation to the service', async () => {
    const response = {
      id: 'comment-1',
      body: 'Muito bom.',
      status: 'VISIBLE',
      createdAt: '2026-06-02T10:00:00.000Z',
      updatedAt: '2026-06-02T10:00:00.000Z',
      author: {
        id: 'user-1',
        name: 'Usuario',
      },
    };
    const user = {
      userId: 'user-1',
      email: 'user@hortivia.local',
      role: 'USER',
    };

    articlesService.createComment.mockResolvedValue(response as never);

    await expect(
      controller.createComment('article-1', { body: 'Muito bom.' }, user as never),
    ).resolves.toEqual(response);
    expect(articlesService.createComment).toHaveBeenCalledWith(
      'article-1',
      { body: 'Muito bom.' },
      user,
    );
  });

  it('delegates comment updates to the service', async () => {
    const response = {
      id: 'comment-1',
      body: 'Texto atualizado.',
      status: 'VISIBLE',
      createdAt: '2026-06-02T10:00:00.000Z',
      updatedAt: '2026-06-02T11:00:00.000Z',
      author: {
        id: 'user-1',
        name: 'Usuario',
      },
    };
    const user = {
      userId: 'user-1',
      email: 'user@hortivia.local',
      role: 'USER',
    };

    articlesService.updateComment.mockResolvedValue(response as never);

    await expect(
      controller.updateComment(
        'article-1',
        'comment-1',
        { body: 'Texto atualizado.' },
        user as never,
      ),
    ).resolves.toEqual(response);
    expect(articlesService.updateComment).toHaveBeenCalledWith(
      'article-1',
      'comment-1',
      { body: 'Texto atualizado.' },
      user,
    );
  });

  it('delegates comment deletion to the service', async () => {
    const response = {
      message: 'Comentario removido.',
    };
    const user = {
      userId: 'user-1',
      email: 'user@hortivia.local',
      role: 'USER',
    };

    articlesService.deleteComment.mockResolvedValue(response as never);

    await expect(
      controller.deleteComment('article-1', 'comment-1', user as never),
    ).resolves.toEqual(response);
    expect(articlesService.deleteComment).toHaveBeenCalledWith(
      'article-1',
      'comment-1',
      user,
    );
  });

  it('delegates comment moderation to the service', async () => {
    const response = {
      id: 'comment-1',
      body: 'Precisa revisar.',
      status: 'HIDDEN',
      createdAt: '2026-06-02T10:00:00.000Z',
      updatedAt: '2026-06-02T11:00:00.000Z',
      author: {
        id: 'user-2',
        name: 'Usuario',
      },
    };
    const user = {
      userId: 'admin-1',
      email: 'admin@hortivia.local',
      role: 'ADMIN',
    };

    articlesService.moderateComment.mockResolvedValue(response as never);

    await expect(
      controller.moderateComment(
        'article-1',
        'comment-1',
        { status: 'HIDDEN' as const },
        user as never,
      ),
    ).resolves.toEqual(response);
    expect(articlesService.moderateComment).toHaveBeenCalledWith(
      'article-1',
      'comment-1',
      { status: 'HIDDEN' },
      user,
    );
  });

  it('delegates article reaction creation to the service', async () => {
    const response = {
      message: 'Marcado como útil.',
      isReacted: true,
      reactionsCount: 12,
    };
    const user = {
      userId: 'user-1',
      email: 'user@hortivia.local',
      role: 'USER',
    };

    articlesService.reactToArticle.mockResolvedValue(response as never);

    await expect(
      controller.reactToArticle('article-1', user as never),
    ).resolves.toEqual(response);
    expect(articlesService.reactToArticle).toHaveBeenCalledWith(
      'article-1',
      user,
    );
  });

  it('delegates article reaction removal to the service', async () => {
    const response = {
      message: 'Reação removida.',
      isReacted: false,
      reactionsCount: 11,
    };
    const user = {
      userId: 'user-1',
      email: 'user@hortivia.local',
      role: 'USER',
    };

    articlesService.removeReactionFromArticle.mockResolvedValue(response as never);

    await expect(
      controller.removeReactionFromArticle('article-1', user as never),
    ).resolves.toEqual(response);
    expect(articlesService.removeReactionFromArticle).toHaveBeenCalledWith(
      'article-1',
      user,
    );
  });
});
