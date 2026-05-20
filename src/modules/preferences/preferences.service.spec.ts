import { UserRole } from '../../generated/prisma/enums';
import { PreferencesRepository } from './preferences.repository';
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  const baseUser = {
    id: 'user-1',
    name: 'Patrick',
    email: 'patrick@email.com',
    passwordHash: 'hashed-password',
    avatarUrl: null,
    gender: null,
    role: UserRole.USER,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  };

  const basePreferences = {
    id: 'preferences-1',
    userId: 'user-1',
    notificationsEnabled: true,
    seasonalTipsEnabled: true,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  };

  const preferencesRepository = {
    findUserById: jest.fn(),
    findByUserId: jest.fn(),
    createDefaultForUser: jest.fn(),
    upsertByUserId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      PreferencesRepository,
      'findUserById' | 'findByUserId' | 'createDefaultForUser' | 'upsertByUserId'
    >
  >;

  let service: PreferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PreferencesService(
      preferencesRepository as unknown as PreferencesRepository,
    );
  });

  it('returns default preferences when missing', async () => {
    preferencesRepository.findUserById.mockResolvedValue(baseUser);
    preferencesRepository.findByUserId.mockResolvedValue(null);
    preferencesRepository.createDefaultForUser.mockResolvedValue(basePreferences);

    const result = await service.getPreferences(baseUser.id);

    expect(preferencesRepository.createDefaultForUser).toHaveBeenCalledWith(
      baseUser.id,
    );
    expect(result).toEqual({
      id: basePreferences.id,
      userId: basePreferences.userId,
      notificationsEnabled: true,
      seasonalTipsEnabled: true,
      createdAt: basePreferences.createdAt.toISOString(),
      updatedAt: basePreferences.updatedAt.toISOString(),
    });
  });

  it('updates notification flags', async () => {
    preferencesRepository.findUserById.mockResolvedValue(baseUser);
    preferencesRepository.upsertByUserId.mockResolvedValue({
      ...basePreferences,
      notificationsEnabled: false,
    });

    const result = await service.updatePreferences(baseUser.id, {
      notificationsEnabled: false,
    });

    expect(preferencesRepository.upsertByUserId).toHaveBeenCalledWith(baseUser.id, {
      notificationsEnabled: false,
    });
    expect(result.notificationsEnabled).toBe(false);
  });
});
