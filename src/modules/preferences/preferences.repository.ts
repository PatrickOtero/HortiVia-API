import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.userPreference.findUnique({
      where: { userId },
    });
  }

  async createDefaultForUser(userId: string) {
    return this.prisma.userPreference.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async upsertByUserId(userId: string, data: Prisma.UserPreferenceUpdateInput) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        user: {
          connect: {
            id: userId,
          },
        },
        notificationsEnabled:
          typeof data.notificationsEnabled === 'boolean'
            ? data.notificationsEnabled
            : true,
        seasonalTipsEnabled:
          typeof data.seasonalTipsEnabled === 'boolean'
            ? data.seasonalTipsEnabled
            : true,
      },
      update: data,
    });
  }
}
