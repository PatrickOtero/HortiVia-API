import { ConflictException, Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import type { CreateUserInput } from './types/user-response';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(data: CreateUserInput) {
    const normalizedEmail = this.normalizeEmail(data.email);
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
    return this.usersRepository.findByEmail(this.normalizeEmail(email));
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private buildDuplicateEmailException() {
    return new ConflictException({
      message: 'Já existe um usuário com este e-mail.',
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

    return targets.length === 0 || targets.includes('email');
  }
}
