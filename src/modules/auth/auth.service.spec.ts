import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UserRole } from '../../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import {
  CONFIRM_EMAIL_SUCCESS_MESSAGE,
  INVALID_CONFIRMATION_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  REGISTER_SUCCESS_MESSAGE,
  RESEND_CONFIRMATION_COOLDOWN_MESSAGE,
  RESEND_CONFIRMATION_SUCCESS_MESSAGE,
  UNVERIFIED_EMAIL_MESSAGE,
} from './auth.constants';
import { AuthService } from './auth.service';
import { hashEmailConfirmationCode } from './utils/email-confirmation-code';

describe('AuthService', () => {
  const baseUser = {
    id: 'user-1',
    name: 'Patrick',
    email: 'patrick@email.com',
    passwordHash: 'hashed-password',
    avatarUrl: null,
    gender: null,
    role: UserRole.USER,
    emailVerified: false,
    emailVerifiedAt: null,
    emailConfirmationCodeHash: null,
    emailConfirmationCodeExpiresAt: null,
    emailConfirmationCodeSentAt: null,
    emailConfirmationAttempts: 0,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  };

  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateEmailConfirmation: jest.fn(),
    updateEmailVerification: jest.fn(),
    incrementEmailConfirmationAttempts: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      UsersService,
      | 'create'
      | 'findByEmail'
      | 'findById'
      | 'updateEmailConfirmation'
      | 'updateEmailVerification'
      | 'incrementEmailConfirmationAttempts'
    >
  >;

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const mailService = {
    sendEmailConfirmationCode: jest.fn(),
  } as unknown as jest.Mocked<Pick<MailService, 'sendEmailConfirmationCode'>>;

  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<Pick<ConfigService, 'get'>>;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('jwt-token');
    configService.get.mockImplementation((key: string) => {
      if (key === 'EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES') {
        return 10;
      }

      if (key === 'EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS') {
        return 60;
      }

      if (key === 'EMAIL_CONFIRMATION_MAX_ATTEMPTS') {
        return 5;
      }

      return undefined;
    });
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      mailService as unknown as MailService,
      configService as unknown as ConfigService,
    );
  });

  it('register creates an unverified user, stores only the code hash and sends the confirmation code e-mail', async () => {
    usersService.create.mockImplementation(async input => ({
      ...baseUser,
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerified: input.emailVerified ?? false,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      emailConfirmationCodeHash: input.emailConfirmationCodeHash ?? null,
      emailConfirmationCodeExpiresAt:
        input.emailConfirmationCodeExpiresAt ?? null,
      emailConfirmationCodeSentAt: input.emailConfirmationCodeSentAt ?? null,
      emailConfirmationAttempts: input.emailConfirmationAttempts ?? 0,
    }));

    const result = await service.register({
      name: 'Patrick',
      email: 'Patrick@Email.com',
      password: 'SenhaForte@123',
    });

    expect(usersService.create).toHaveBeenCalledTimes(1);
    const createInput = usersService.create.mock.calls[0][0];

    expect(createInput.name).toBe('Patrick');
    expect(createInput.email).toBe('patrick@email.com');
    expect(createInput.role).toBe(UserRole.USER);
    expect(createInput.emailVerified).toBe(false);
    expect(createInput.passwordHash).not.toBe('SenhaForte@123');
    await expect(compare('SenhaForte@123', createInput.passwordHash)).resolves.toBe(
      true,
    );

    expect(mailService.sendEmailConfirmationCode).toHaveBeenCalledTimes(1);
    const code = mailService.sendEmailConfirmationCode.mock.calls[0][1];

    expect(code).toMatch(/^\d{6}$/);
    expect(createInput.emailConfirmationCodeHash).toBe(
      hashEmailConfirmationCode(createInput.email, code),
    );
    expect(createInput.emailConfirmationCodeHash).not.toBe(code);
    expect(createInput.emailConfirmationAttempts).toBe(0);
    expect(createInput.emailConfirmationCodeSentAt).toBeInstanceOf(Date);
    expect(createInput.emailConfirmationCodeExpiresAt).toBeInstanceOf(Date);
    expect(result).toEqual({
      message: REGISTER_SUCCESS_MESSAGE,
      user: {
        id: baseUser.id,
        name: baseUser.name,
        email: 'patrick@email.com',
        avatarUrl: null,
        gender: null,
        role: UserRole.USER,
        emailVerified: false,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
      },
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
    expect(usersService.findByEmail).toHaveBeenCalledWith('missing@email.com');
  });

  it('login throws unauthorized when the password is invalid', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: await hash('another-password', 10),
      emailVerified: true,
    });

    await expect(
      service.login({
        email: '  Patrick@Email.com  ',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CREDENTIALS_MESSAGE,
      },
    });
    expect(usersService.findByEmail).toHaveBeenCalledWith('patrick@email.com');
  });

  it('login rejects unverified users with 403', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: await hash('password123', 10),
      emailVerified: false,
    });

    await expect(
      service.login({
        email: 'patrick@email.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: UNVERIFIED_EMAIL_MESSAGE,
      },
      status: 403,
    });
  });

  it('login returns an access token and a safe user response for verified users', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: await hash('password123', 10),
      emailVerified: true,
    });

    const result = await service.login({
      email: '  Patrick@Email.com  ',
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
        emailVerified: true,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
      },
      accessToken: 'jwt-token',
    });
    expect(usersService.findByEmail).toHaveBeenCalledWith('patrick@email.com');
  });

  it('confirm-email accepts a valid code and clears confirmation fields', async () => {
    const code = '123456';
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailConfirmationCodeHash: hashEmailConfirmationCode(baseUser.email, code),
      emailConfirmationCodeExpiresAt: new Date(Date.now() + 60_000),
      emailConfirmationCodeSentAt: new Date(Date.now() - 10_000),
      emailConfirmationAttempts: 1,
    });

    const result = await service.confirmEmail({
      email: baseUser.email,
      code,
    });

    expect(usersService.updateEmailVerification).toHaveBeenCalledWith(
      baseUser.id,
      expect.objectContaining({
        emailVerified: true,
        emailConfirmationCodeHash: null,
        emailConfirmationCodeExpiresAt: null,
        emailConfirmationCodeSentAt: null,
        emailConfirmationAttempts: 0,
      }),
    );
    expect(result).toEqual({
      message: CONFIRM_EMAIL_SUCCESS_MESSAGE,
    });
  });

  it('confirm-email rejects wrong code and increments attempts', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailConfirmationCodeHash: hashEmailConfirmationCode(baseUser.email, '123456'),
      emailConfirmationCodeExpiresAt: new Date(Date.now() + 60_000),
      emailConfirmationCodeSentAt: new Date(Date.now() - 10_000),
      emailConfirmationAttempts: 0,
    });

    await expect(
      service.confirmEmail({
        email: baseUser.email,
        code: '654321',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });

    expect(usersService.incrementEmailConfirmationAttempts).toHaveBeenCalledWith(
      baseUser.id,
    );
  });

  it('confirm-email rejects expired code', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailConfirmationCodeHash: hashEmailConfirmationCode(baseUser.email, '123456'),
      emailConfirmationCodeExpiresAt: new Date(Date.now() - 60_000),
      emailConfirmationCodeSentAt: new Date(Date.now() - 120_000),
      emailConfirmationAttempts: 0,
    });

    await expect(
      service.confirmEmail({
        email: baseUser.email,
        code: '123456',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });
  });

  it('confirm-email rejects after max attempts', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailConfirmationCodeHash: hashEmailConfirmationCode(baseUser.email, '123456'),
      emailConfirmationCodeExpiresAt: new Date(Date.now() + 60_000),
      emailConfirmationCodeSentAt: new Date(Date.now() - 10_000),
      emailConfirmationAttempts: 5,
    });

    await expect(
      service.confirmEmail({
        email: baseUser.email,
        code: '123456',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });
  });

  it('confirm-email does not reveal unknown e-mail', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.confirmEmail({
        email: 'missing@email.com',
        code: '123456',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });
  });

  it('confirm-email returns success for already verified users', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailVerified: true,
    });

    await expect(
      service.confirmEmail({
        email: baseUser.email,
        code: '123456',
      }),
    ).resolves.toEqual({
      message: CONFIRM_EMAIL_SUCCESS_MESSAGE,
    });
  });

  it('resend-confirmation returns a generic message for an unknown e-mail', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const result = await service.resendConfirmation({
      email: 'missing@email.com',
    });

    expect(result).toEqual({
      message: RESEND_CONFIRMATION_SUCCESS_MESSAGE,
    });
    expect(usersService.updateEmailConfirmation).not.toHaveBeenCalled();
    expect(mailService.sendEmailConfirmationCode).not.toHaveBeenCalled();
  });

  it('resend-confirmation enforces cooldown', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailConfirmationCodeSentAt: new Date(),
    });

    await expect(
      service.resendConfirmation({
        email: baseUser.email,
      }),
    ).rejects.toMatchObject({
      response: {
        message: RESEND_CONFIRMATION_COOLDOWN_MESSAGE,
      },
      status: 429,
    });
  });

  it('resend-confirmation sends a new code and resets attempts for an unverified user', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailVerified: false,
      emailConfirmationCodeSentAt: new Date(Date.now() - 120_000),
      emailConfirmationAttempts: 4,
    });

    const result = await service.resendConfirmation({
      email: 'Patrick@Email.com',
    });

    expect(usersService.updateEmailConfirmation).toHaveBeenCalledTimes(1);
    const updateInput = usersService.updateEmailConfirmation.mock.calls[0][1];
    const code = mailService.sendEmailConfirmationCode.mock.calls[0][1];

    expect(code).toMatch(/^\d{6}$/);
    expect(updateInput.emailConfirmationCodeHash).toBe(
      hashEmailConfirmationCode(baseUser.email, code),
    );
    expect(updateInput.emailConfirmationAttempts).toBe(0);
    expect(updateInput.emailConfirmationCodeSentAt).toBeInstanceOf(Date);
    expect(updateInput.emailConfirmationCodeExpiresAt).toBeInstanceOf(Date);
    expect(mailService.sendEmailConfirmationCode).toHaveBeenCalledWith(
      baseUser.email,
      code,
    );
    expect(result).toEqual({
      message: RESEND_CONFIRMATION_SUCCESS_MESSAGE,
    });
  });

  it('/auth/me returns a safe user with emailVerified', async () => {
    usersService.findById.mockResolvedValue({
      ...baseUser,
      emailVerified: true,
      emailVerifiedAt: new Date('2026-05-21T00:00:00.000Z'),
      emailConfirmationCodeHash: 'code-hash',
      emailConfirmationCodeExpiresAt: new Date('2026-05-22T00:00:00.000Z'),
      emailConfirmationCodeSentAt: new Date('2026-05-21T23:55:00.000Z'),
      emailConfirmationAttempts: 2,
    });

    const result = await service.getAuthenticatedUser({
      userId: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
    });

    expect(result).toEqual({
      id: baseUser.id,
      name: baseUser.name,
      email: baseUser.email,
      avatarUrl: null,
      gender: null,
      role: UserRole.USER,
      emailVerified: true,
      createdAt: baseUser.createdAt,
      updatedAt: baseUser.updatedAt,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('emailConfirmationCodeHash');
    expect(result).not.toHaveProperty('emailConfirmationCodeExpiresAt');
    expect(result).not.toHaveProperty('emailConfirmationCodeSentAt');
    expect(result).not.toHaveProperty('emailConfirmationAttempts');
  });
});
