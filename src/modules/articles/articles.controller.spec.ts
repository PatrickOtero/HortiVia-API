import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

describe('ArticlesController', () => {
  const articlesService = {
    getByIdForAdmin: jest.fn(),
    createBlockImageUploadUrl: jest.fn(),
    uploadBlockImage: jest.fn(),
    updateBlockImage: jest.fn(),
    removeBlockImage: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      ArticlesService,
      | 'getByIdForAdmin'
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
});
