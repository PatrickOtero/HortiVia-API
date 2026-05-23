import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeEmail } from '../../common/utils/normalize-email';
import type { Prisma } from '../../generated/prisma/client';
import { UsersRepository } from './users.repository';
import { toSafeUser } from './users.mapper';
import type {
  CreateUserInput,
  UpdateEmailConfirmationInput,
  UpdateUserInput,
  VerifyEmailInput,
  UsersListResponse,
} from './types/user-response';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly defaultPage = 1;
  private readonly defaultLimit = 10;
  private readonly maxLimit = 50;

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(data: CreateUserInput) {
    const normalizedEmail = normalizeEmail(data.email);
    const existingUser = await this.usersRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw this.buildDuplicateEmailException();
    }

    try {
      return await this.usersRepository.create({
        ...data,
        email: normalizedEmail,
      });
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw this.buildDuplicateEmailException();
      }

      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(normalizeEmail(email));
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async list(query: ListUsersQueryDto): Promise<UsersListResponse> {
    const page = query.page ?? this.defaultPage;
    const limit = Math.min(query.limit ?? this.defaultLimit, this.maxLimit);
    const where = this.buildListWhereInput(query);

    const [users, total] = await Promise.all([
      this.usersRepository.findManyWithPagination({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.usersRepository.count(where),
    ]);

    return {
      data: users.map(toSafeUser),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw this.buildUserNotFoundException();
    }

    return toSafeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw this.buildUserNotFoundException();
    }

    const data: UpdateUserInput = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name.trim();
    }

    if (updateUserDto.avatarUrl !== undefined) {
      data.avatarUrl = this.normalizeOptionalText(updateUserDto.avatarUrl);
    }

    if (updateUserDto.gender !== undefined) {
      data.gender = updateUserDto.gender;
    }

    if (updateUserDto.role !== undefined) {
      data.role = updateUserDto.role;
    }

    if (updateUserDto.email !== undefined) {
      const normalizedEmail = normalizeEmail(updateUserDto.email);
      const userWithSameEmail = await this.usersRepository.findByEmail(
        normalizedEmail,
      );

      if (userWithSameEmail && userWithSameEmail.id !== id) {
        throw this.buildDuplicateEmailException();
      }

      data.email = normalizedEmail;
    }

    if (updateUserDto.emailVerified !== undefined) {
      data.emailVerified = updateUserDto.emailVerified;
      data.emailVerifiedAt = updateUserDto.emailVerified ? new Date() : null;

      if (updateUserDto.emailVerified) {
        data.emailConfirmationCodeHash = null;
        data.emailConfirmationCodeExpiresAt = null;
        data.emailConfirmationCodeSentAt = null;
        data.emailConfirmationAttempts = 0;
      }
    }

    if (Object.keys(data).length === 0) {
      return toSafeUser(existingUser);
    }

    try {
      const updatedUser = await this.usersRepository.update(id, data);

      return toSafeUser(updatedUser);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw this.buildDuplicateEmailException();
      }

      if (this.isRecordNotFoundError(error)) {
        throw this.buildUserNotFoundException();
      }

      throw error;
    }
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException({
        message: 'Voce nao pode excluir a propria conta.',
        error: 'Forbidden',
      });
    }

    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw this.buildUserNotFoundException();
    }

    try {
      await this.usersRepository.delete(id);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw this.buildUserNotFoundException();
      }

      if (this.isRelationConstraintError(error)) {
        throw new ConflictException({
          message: 'Nao foi possivel remover o usuario porque ele possui dados vinculados.',
          error: 'Conflict',
        });
      }

      throw error;
    }

    return {
      message: 'Usuario removido.',
    };
  }

  async updateEmailConfirmation(
    userId: string,
    data: UpdateEmailConfirmationInput,
  ) {
    return this.usersRepository.updateEmailConfirmation(userId, data);
  }

  async updateEmailVerification(userId: string, data: VerifyEmailInput) {
    return this.usersRepository.updateEmailVerification(userId, data);
  }

  async incrementEmailConfirmationAttempts(userId: string) {
    return this.usersRepository.incrementEmailConfirmationAttempts(userId);
  }

  private buildListWhereInput(query: ListUsersQueryDto): Prisma.UserWhereInput {
    const trimmedSearch = query.search?.trim();

    return {
      ...(trimmedSearch
        ? {
            OR: [
              {
                name: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.emailVerified !== undefined
        ? { emailVerified: query.emailVerified }
        : {}),
    };
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private buildUserNotFoundException() {
    return new NotFoundException({
      message: 'Usuario nao encontrado.',
      error: 'Not Found',
    });
  }

  private buildDuplicateEmailException() {
    return new ConflictException({
      message: 'Este e-mail j\u00e1 est\u00e1 em uso.',
      error: 'Conflict',
    });
  }

  private isDuplicateEmailError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    const prismaError = error as {
      code?: string;
      meta?: {
        target?: unknown;
      };
    };

    if (prismaError.code !== 'P2002') {
      return false;
    }

    const targets = Array.isArray(prismaError.meta?.target)
      ? prismaError.meta.target
      : [];

    return (
      targets.length === 0 ||
      targets.includes('email') ||
      targets.includes('emailConfirmationCodeHash')
    );
  }

  private isRecordNotFoundError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === 'P2025';
  }

  private isRelationConstraintError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === 'P2003';
  }
}
