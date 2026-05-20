import { Gender, UserRole } from '../../generated/prisma/enums';
import { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
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

  const profileRepository = {
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    updateUserProfile: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      ProfileRepository,
      'findUserById' | 'findUserByEmail' | 'updateUserProfile'
    >
  >;

  let service: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(
      profileRepository as unknown as ProfileRepository,
    );
  });

  it('returns the authenticated profile without passwordHash', async () => {
    profileRepository.findUserById.mockResolvedValue(baseUser);

    const result = await service.getProfile(baseUser.id);

    expect(result).toEqual({
      id: baseUser.id,
      name: baseUser.name,
      email: baseUser.email,
      avatarUrl: null,
      gender: null,
      role: UserRole.USER,
      createdAt: baseUser.createdAt.toISOString(),
      updatedAt: baseUser.updatedAt.toISOString(),
    });
  });

  it('updates the profile name', async () => {
    profileRepository.findUserById.mockResolvedValue(baseUser);
    profileRepository.updateUserProfile.mockResolvedValue({
      ...baseUser,
      name: 'Patrick Otero',
    });

    const result = await service.updateProfile(baseUser.id, {
      name: 'Patrick Otero',
    });

    expect(profileRepository.updateUserProfile).toHaveBeenCalledWith(baseUser.id, {
      name: 'Patrick Otero',
    });
    expect(result.name).toBe('Patrick Otero');
  });

  it('normalizes the e-mail when updating the profile', async () => {
    profileRepository.findUserById.mockResolvedValue(baseUser);
    profileRepository.findUserByEmail.mockResolvedValue(null);
    profileRepository.updateUserProfile.mockResolvedValue({
      ...baseUser,
      email: 'patrick.otero@email.com',
    });

    const result = await service.updateProfile(baseUser.id, {
      email: 'Patrick.Otero@Email.com',
    });

    expect(profileRepository.findUserByEmail).toHaveBeenCalledWith(
      'patrick.otero@email.com',
    );
    expect(profileRepository.updateUserProfile).toHaveBeenCalledWith(baseUser.id, {
      email: 'patrick.otero@email.com',
    });
    expect(result.email).toBe('patrick.otero@email.com');
  });

  it('rejects duplicate e-mail updates', async () => {
    profileRepository.findUserById.mockResolvedValue(baseUser);
    profileRepository.findUserByEmail.mockResolvedValue({
      ...baseUser,
      id: 'user-2',
      email: 'used@email.com',
    });

    await expect(
      service.updateProfile(baseUser.id, {
        email: 'used@email.com',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Ja existe um usuario com este e-mail.',
      },
    });
  });

  it('updates gender when provided', async () => {
    profileRepository.findUserById.mockResolvedValue(baseUser);
    profileRepository.updateUserProfile.mockResolvedValue({
      ...baseUser,
      gender: Gender.MALE,
    });

    const result = await service.updateProfile(baseUser.id, {
      gender: Gender.MALE,
    });

    expect(profileRepository.updateUserProfile).toHaveBeenCalledWith(baseUser.id, {
      gender: Gender.MALE,
    });
    expect(result.gender).toBe(Gender.MALE);
  });
});
