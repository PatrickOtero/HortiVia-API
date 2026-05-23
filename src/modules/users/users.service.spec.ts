import { ConflictException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findManyWithPagination: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementEmailConfirmationAttempts: jest.fn(),
    updateEmailConfirmation: jest.fn(),
    updateEmailVerification: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      UsersRepository,
      | 'create'
      | 'findByEmail'
      | 'findById'
      | 'findManyWithPagination'
      | 'count'
      | 'update'
      | 'delete'
      | 'incrementEmailConfirmationAttempts'
      | 'updateEmailConfirmation'
      | 'updateEmailVerification'
    >
  >;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(usersRepository as unknown as UsersRepository);
  });

  it('throws conflict when creating a duplicate e-mail', async () => {
    usersRepository.findByEmail.mockResolvedValue({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create({
        name: 'Patrick',
        email: 'Patrick@Email.com',
        passwordHash: 'hashed-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(usersRepository.findByEmail).toHaveBeenCalledWith(
      'patrick@email.com',
    );
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('normalizes the e-mail before creating a user', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation(async input => ({
      id: 'user-1',
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      avatarUrl: null,
      gender: null,
      role: input.role ?? UserRole.USER,
      emailVerified: input.emailVerified ?? false,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      emailConfirmationCodeHash: input.emailConfirmationCodeHash ?? null,
      emailConfirmationCodeExpiresAt:
        input.emailConfirmationCodeExpiresAt ?? null,
      emailConfirmationCodeSentAt:
        input.emailConfirmationCodeSentAt ?? null,
      emailConfirmationAttempts: input.emailConfirmationAttempts ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.create({
      name: 'Patrick',
      email: '  Patrick@Email.com  ',
      passwordHash: 'hashed-password',
    });

    expect(usersRepository.findByEmail).toHaveBeenCalledWith(
      'patrick@email.com',
    );
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'patrick@email.com',
      }),
    );
  });

  it('updates user email with normalization and role change', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 'user-1',
      name: 'Patrick',
      email: 'patrick@email.com',
      passwordHash: 'hashed-password',
      avatarUrl: null,
      gender: null,
      role: UserRole.USER,
      emailVerified: false,
      emailVerifiedAt: null,
      emailConfirmationCodeHash: 'hash',
      emailConfirmationCodeExpiresAt: new Date('2026-05-23T00:00:00.000Z'),
      emailConfirmationCodeSentAt: new Date('2026-05-22T00:00:00.000Z'),
      emailConfirmationAttempts: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.update.mockImplementation(async (_id, input) => ({
      id: 'user-1',
      name: 'Patrick',
      email: input.email ?? 'patrick@email.com',
      passwordHash: 'hashed-password',
      avatarUrl: null,
      gender: null,
      role: input.role ?? UserRole.USER,
      emailVerified: input.emailVerified ?? false,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      emailConfirmationCodeHash: input.emailConfirmationCodeHash ?? null,
      emailConfirmationCodeExpiresAt:
        input.emailConfirmationCodeExpiresAt ?? null,
      emailConfirmationCodeSentAt:
        input.emailConfirmationCodeSentAt ?? null,
      emailConfirmationAttempts: input.emailConfirmationAttempts ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.update('user-1', {
      email: '  Novo@Email.com  ',
      role: UserRole.ADMIN,
      emailVerified: true,
    });

    expect(usersRepository.findByEmail).toHaveBeenCalledWith('novo@email.com');
    expect(usersRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        email: 'novo@email.com',
        role: UserRole.ADMIN,
        emailVerified: true,
        emailConfirmationCodeHash: null,
        emailConfirmationCodeExpiresAt: null,
        emailConfirmationCodeSentAt: null,
        emailConfirmationAttempts: 0,
      }),
    );
  });

  it('does not allow deleting the current user', async () => {
    await expect(service.remove('user-1', 'user-1')).rejects.toMatchObject({
      response: {
        message: 'Voce nao pode excluir a propria conta.',
      },
    });

    expect(usersRepository.delete).not.toHaveBeenCalled();
  });
});
