import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type {
  CreateUserInput,
  UpdateEmailConfirmationInput,
  UpdateUserInput,
  VerifyEmailInput,
} from './types/user-response';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserInput) {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findManyWithPagination(params: {
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
  }) {
    return this.prisma.user.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          email: 'asc',
        },
      ],
    });
  }

  async count(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
  }

  async updateEmailConfirmation(
    userId: string,
    data: UpdateEmailConfirmationInput,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateEmailVerification(userId: string, data: VerifyEmailInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async incrementEmailConfirmationAttempts(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailConfirmationAttempts: {
          increment: 1,
        },
      },
    });
  }

  async update(userId: string, data: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async delete(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
