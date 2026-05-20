import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { toSafeUser } from '../users/users.mapper';
import { UserRole } from '../../generated/prisma/enums';
import { INVALID_CREDENTIALS_MESSAGE } from './auth.constants';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type {
  AuthenticatedUser,
  JwtPayload,
} from './types/authenticated-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const passwordHash = await hash(registerDto.password, 10);
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      passwordHash,
      role: UserRole.USER,
    });

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw this.buildInvalidCredentialsException();
    }

    const passwordMatches = await compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      throw this.buildInvalidCredentialsException();
    }

    return this.buildAuthResponse(user);
  }

  async getAuthenticatedUser(authenticatedUser: AuthenticatedUser) {
    const user = await this.usersService.findById(authenticatedUser.userId);

    if (!user) {
      throw new UnauthorizedException({
        message: 'Usuário autenticado não encontrado.',
        error: 'Unauthorized',
      });
    }

    return toSafeUser(user);
  }

  private async buildAuthResponse(user: Awaited<ReturnType<UsersService['findById']>>) {
    if (!user) {
      throw this.buildInvalidCredentialsException();
    }

    return {
      user: toSafeUser(user),
      accessToken: await this.signAccessToken(user),
    };
  }

  private async signAccessToken(user: {
    id: string;
    email: string;
    role: (typeof UserRole)[keyof typeof UserRole];
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private buildInvalidCredentialsException() {
    return new UnauthorizedException({
      message: INVALID_CREDENTIALS_MESSAGE,
      error: 'Unauthorized',
    });
  }
}
