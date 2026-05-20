import { ConflictException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<UsersRepository, 'create' | 'findByEmail' | 'findById'>
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
});
