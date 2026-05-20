import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UserRole } from '../../generated/prisma/enums';
import { AuthService } from './auth.service';
import { INVALID_CREDENTIALS_MESSAGE } from './auth.constants';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
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

  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<UsersService, 'create' | 'findByEmail' | 'findById'>
  >;

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<Pick<JwtService, 'signAsync'>>;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('jwt-token');
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('register creates a user with a hashed password', async () => {
    usersService.create.mockImplementation(async input => ({
      ...baseUser,
      email: input.email,
      passwordHash: input.passwordHash,
    }));

    const result = await service.register({
      name: 'Patrick',
      email: 'Patrick@Email.com',
      password: 'password123',
    });

    expect(usersService.create).toHaveBeenCalledTimes(1);

    const createInput = usersService.create.mock.calls[0][0];

    expect(createInput.name).toBe('Patrick');
    expect(createInput.email).toBe('Patrick@Email.com');
    expect(createInput.role).toBe(UserRole.USER);
    expect(createInput.passwordHash).not.toBe('password123');
    await expect(compare('password123', createInput.passwordHash)).resolves.toBe(
      true,
    );

    expect(result).toEqual({
      user: {
        id: baseUser.id,
        name: baseUser.name,
        email: 'Patrick@Email.com',
        avatarUrl: null,
        gender: null,
        role: UserRole.USER,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
      },
      accessToken: 'jwt-token',
    });
  });

  it('login throws unauthorized when the e-mail is invalid', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@email.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CREDENTIALS_MESSAGE,
      },
    });
  });

  it('login throws unauthorized when the password is invalid', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: await hash('another-password', 10),
    });

    await expect(
      service.login({
        email: baseUser.email,
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CREDENTIALS_MESSAGE,
      },
    });
  });

  it('login returns an access token and a safe user response', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: await hash('password123', 10),
    });

    const result = await service.login({
      email: baseUser.email,
      password: 'password123',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: baseUser.id,
      email: baseUser.email,
      role: UserRole.USER,
    });
    expect(result).toEqual({
      user: {
        id: baseUser.id,
        name: baseUser.name,
        email: baseUser.email,
        avatarUrl: null,
        gender: null,
        role: UserRole.USER,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
      },
      accessToken: 'jwt-token',
    });
  });
});
