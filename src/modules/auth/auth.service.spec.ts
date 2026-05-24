import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UserRole } from '../../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import {
  CONFIRM_EMAIL_SUCCESS_MESSAGE,
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  INVALID_CONFIRMATION_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  PASSWORD_RESET_COOLDOWN_MESSAGE,
  REGISTER_SUCCESS_MESSAGE,
  RESET_PASSWORD_SUCCESS_MESSAGE,
  RESEND_CONFIRMATION_COOLDOWN_MESSAGE,
  RESEND_CONFIRMATION_SUCCESS_MESSAGE,
  RESEND_PASSWORD_RESET_CODE_SUCCESS_MESSAGE,
  UNVERIFIED_EMAIL_MESSAGE,
} from './auth.constants';
import { AuthService } from './auth.service';
import { hashEmailConfirmationCode } from './utils/email-confirmation-code';
import { hashPasswordResetCode } from './utils/password-reset-code';

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
    passwordResetCodeHash: null,
    passwordResetCodeExpiresAt: null,
    passwordResetCodeSentAt: null,
    passwordResetAttempts: 0,
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
    updatePasswordResetCode: jest.fn(),
    incrementPasswordResetAttempts: jest.fn(),
    updatePasswordHashAndClearResetCode: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      UsersService,
      | 'create'
      | 'findByEmail'
      | 'findById'
      | 'updateEmailConfirmation'
      | 'updateEmailVerification'
      | 'incrementEmailConfirmationAttempts'
      | 'updatePasswordResetCode'
      | 'incrementPasswordResetAttempts'
      | 'updatePasswordHashAndClearResetCode'
    >
  >;

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const mailService = {
    sendEmailConfirmationCode: jest.fn(),
    sendPasswordResetCode: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<MailService, 'sendEmailConfirmationCode' | 'sendPasswordResetCode'>
  >;

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

      if (key === 'PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES') {
        return 10;
      }

      if (key === 'PASSWORD_RESET_RESEND_COOLDOWN_SECONDS') {
        return 60;
      }

      if (key === 'PASSWORD_RESET_MAX_ATTEMPTS') {
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
      passwordResetCodeHash: input.passwordResetCodeHash ?? null,
      passwordResetCodeExpiresAt: input.passwordResetCodeExpiresAt ?? null,
      passwordResetCodeSentAt: input.passwordResetCodeSentAt ?? null,
      passwordResetAttempts: input.passwordResetAttempts ?? 0,
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
      emailConfirmationCodeHash: hashEmailConfirmationCode(
        baseUser.email,
        '123456',
      ),
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
      emailConfirmationCodeHash: hashEmailConfirmationCode(
        baseUser.email,
        '123456',
      ),
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
      emailConfirmationCodeHash: hashEmailConfirmationCode(
        baseUser.email,
        '123456',
      ),
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

  it('forgot-password returns a generic response for an unknown e-mail', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const result = await service.forgotPassword({
      email: 'missing@email.com',
    });

    expect(result).toEqual({
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    });
    expect(usersService.updatePasswordResetCode).not.toHaveBeenCalled();
    expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('forgot-password stores the reset code hash and sends the reset code e-mail', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailVerified: true,
    });

    const result = await service.forgotPassword({
      email: ' Patrick@Email.com ',
    });

    expect(usersService.updatePasswordResetCode).toHaveBeenCalledTimes(1);
    const updateInput = usersService.updatePasswordResetCode.mock.calls[0][1];
    const code = mailService.sendPasswordResetCode.mock.calls[0][1];

    expect(code).toMatch(/^\d{6}$/);
    expect(updateInput.passwordResetCodeHash).toBe(
      hashPasswordResetCode(baseUser.email, code),
    );
    expect(updateInput.passwordResetCodeHash).not.toBe(code);
    expect(updateInput.passwordResetAttempts).toBe(0);
    expect(updateInput.passwordResetCodeSentAt).toBeInstanceOf(Date);
    expect(updateInput.passwordResetCodeExpiresAt).toBeInstanceOf(Date);
    expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
      baseUser.email,
      code,
    );
    expect(result).toEqual({
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    });
  });

  it('reset-password accepts a valid e-mail, code and strong password', async () => {
    const code = '123456';
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      emailVerified: true,
      passwordResetCodeHash: hashPasswordResetCode(baseUser.email, code),
      passwordResetCodeExpiresAt: new Date(Date.now() + 60_000),
      passwordResetCodeSentAt: new Date(Date.now() - 10_000),
      passwordResetAttempts: 1,
    });

    const result = await service.resetPassword({
      email: baseUser.email,
      code,
      password: 'NovaSenha@123',
    });

    expect(usersService.updatePasswordHashAndClearResetCode).toHaveBeenCalledWith(
      baseUser.id,
      expect.objectContaining({
        passwordResetCodeHash: null,
        passwordResetCodeExpiresAt: null,
        passwordResetCodeSentAt: null,
        passwordResetAttempts: 0,
      }),
    );
    const updateInput =
      usersService.updatePasswordHashAndClearResetCode.mock.calls[0][1];
    expect(updateInput.passwordHash).not.toBe('NovaSenha@123');
    await expect(compare('NovaSenha@123', updateInput.passwordHash)).resolves.toBe(
      true,
    );
    expect(result).toEqual({
      message: RESET_PASSWORD_SUCCESS_MESSAGE,
    });
  });

  it('reset-password rejects wrong code and increments attempts', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordResetCodeHash: hashPasswordResetCode(baseUser.email, '123456'),
      passwordResetCodeExpiresAt: new Date(Date.now() + 60_000),
      passwordResetCodeSentAt: new Date(Date.now() - 10_000),
      passwordResetAttempts: 0,
    });

    await expect(
      service.resetPassword({
        email: baseUser.email,
        code: '654321',
        password: 'NovaSenha@123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });

    expect(usersService.incrementPasswordResetAttempts).toHaveBeenCalledWith(
      baseUser.id,
    );
  });

  it('reset-password rejects expired code', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordResetCodeHash: hashPasswordResetCode(baseUser.email, '123456'),
      passwordResetCodeExpiresAt: new Date(Date.now() - 60_000),
      passwordResetCodeSentAt: new Date(Date.now() - 120_000),
      passwordResetAttempts: 0,
    });

    await expect(
      service.resetPassword({
        email: baseUser.email,
        code: '123456',
        password: 'NovaSenha@123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });
  });

  it('reset-password rejects after max attempts', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordResetCodeHash: hashPasswordResetCode(baseUser.email, '123456'),
      passwordResetCodeExpiresAt: new Date(Date.now() + 60_000),
      passwordResetCodeSentAt: new Date(Date.now() - 10_000),
      passwordResetAttempts: 5,
    });

    await expect(
      service.resetPassword({
        email: baseUser.email,
        code: '123456',
        password: 'NovaSenha@123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });
  });

  it('reset-password does not reveal unknown e-mail', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        email: 'missing@email.com',
        code: '123456',
        password: 'NovaSenha@123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CONFIRMATION_MESSAGE,
      },
      status: 400,
    });
  });

  it('reset-password updates the hash so the new password works and the old one fails', async () => {
    const currentUser: Omit<
      typeof baseUser,
      | 'passwordResetCodeHash'
      | 'passwordResetCodeExpiresAt'
      | 'passwordResetCodeSentAt'
    > & {
      passwordResetCodeHash: string | null;
      passwordResetCodeExpiresAt: Date | null;
      passwordResetCodeSentAt: Date | null;
    } = {
      ...baseUser,
      emailVerified: true,
      passwordHash: await hash('SenhaAntiga@123', 10),
      passwordResetCodeHash: hashPasswordResetCode(baseUser.email, '123456'),
      passwordResetCodeExpiresAt: new Date(Date.now() + 60_000),
      passwordResetCodeSentAt: new Date(Date.now() - 10_000),
      passwordResetAttempts: 0,
    };

    usersService.findByEmail.mockImplementation(async email => {
      if (email !== currentUser.email) {
        return null;
      }

      return currentUser;
    });
    usersService.updatePasswordHashAndClearResetCode.mockImplementation(
      async (_id, input) => {
        currentUser.passwordHash = input.passwordHash;
        currentUser.passwordResetCodeHash = null;
        currentUser.passwordResetCodeExpiresAt = null;
        currentUser.passwordResetCodeSentAt = null;
        currentUser.passwordResetAttempts = input.passwordResetAttempts;

        return currentUser;
      },
    );

    await service.resetPassword({
      email: currentUser.email,
      code: '123456',
      password: 'NovaSenha@123',
    });

    await expect(
      service.login({
        email: currentUser.email,
        password: 'SenhaAntiga@123',
      }),
    ).rejects.toMatchObject({
      response: {
        message: INVALID_CREDENTIALS_MESSAGE,
      },
    });

    await expect(
      service.login({
        email: currentUser.email,
        password: 'NovaSenha@123',
      }),
    ).resolves.toMatchObject({
      accessToken: 'jwt-token',
      user: {
        id: currentUser.id,
      },
    });
  });

  it('resend-password-reset-code returns a generic response for an unknown e-mail', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const result = await service.resendPasswordResetCode({
      email: 'missing@email.com',
    });

    expect(result).toEqual({
      message: RESEND_PASSWORD_RESET_CODE_SUCCESS_MESSAGE,
    });
    expect(usersService.updatePasswordResetCode).not.toHaveBeenCalled();
    expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('resend-password-reset-code enforces cooldown', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordResetCodeSentAt: new Date(),
    });

    await expect(
      service.resendPasswordResetCode({
        email: baseUser.email,
      }),
    ).rejects.toMatchObject({
      response: {
        message: PASSWORD_RESET_COOLDOWN_MESSAGE,
      },
      status: 429,
    });
  });

  it('resend-password-reset-code sends a new code and resets attempts', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      passwordResetCodeSentAt: new Date(Date.now() - 120_000),
      passwordResetAttempts: 4,
    });

    const result = await service.resendPasswordResetCode({
      email: 'Patrick@Email.com',
    });

    expect(usersService.updatePasswordResetCode).toHaveBeenCalledTimes(1);
    const updateInput = usersService.updatePasswordResetCode.mock.calls[0][1];
    const code = mailService.sendPasswordResetCode.mock.calls[0][1];

    expect(code).toMatch(/^\d{6}$/);
    expect(updateInput.passwordResetCodeHash).toBe(
      hashPasswordResetCode(baseUser.email, code),
    );
    expect(updateInput.passwordResetAttempts).toBe(0);
    expect(updateInput.passwordResetCodeSentAt).toBeInstanceOf(Date);
    expect(updateInput.passwordResetCodeExpiresAt).toBeInstanceOf(Date);
    expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
      baseUser.email,
      code,
    );
    expect(result).toEqual({
      message: RESEND_PASSWORD_RESET_CODE_SUCCESS_MESSAGE,
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
      passwordResetCodeHash: 'reset-hash',
      passwordResetCodeExpiresAt: new Date('2026-05-22T00:00:00.000Z'),
      passwordResetCodeSentAt: new Date('2026-05-21T23:55:00.000Z'),
      passwordResetAttempts: 2,
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
    expect(result).not.toHaveProperty('passwordResetCodeHash');
    expect(result).not.toHaveProperty('passwordResetCodeExpiresAt');
    expect(result).not.toHaveProperty('passwordResetCodeSentAt');
    expect(result).not.toHaveProperty('passwordResetAttempts');
  });
});
