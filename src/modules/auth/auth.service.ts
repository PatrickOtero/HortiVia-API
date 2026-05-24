import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UserRole } from '../../generated/prisma/enums';
import { normalizeEmail } from '../../common/utils/normalize-email';
import { MailService } from '../mail/mail.service';
import { toSafeUser } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import {
  CONFIRM_EMAIL_SUCCESS_MESSAGE,
  EMAIL_CONFIRMATION_SEND_FAILURE_MESSAGE,
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  INVALID_CONFIRMATION_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  PASSWORD_RESET_COOLDOWN_MESSAGE,
  PASSWORD_RESET_SEND_FAILURE_MESSAGE,
  REGISTER_SUCCESS_MESSAGE,
  RESET_PASSWORD_SUCCESS_MESSAGE,
  RESEND_CONFIRMATION_COOLDOWN_MESSAGE,
  RESEND_CONFIRMATION_SUCCESS_MESSAGE,
  RESEND_PASSWORD_RESET_CODE_SUCCESS_MESSAGE,
  UNVERIFIED_EMAIL_MESSAGE,
} from './auth.constants';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { ResendEmailConfirmationDto } from './dto/resend-email-confirmation.dto';
import { ResendPasswordResetCodeDto } from './dto/resend-password-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type {
  AuthenticatedUser,
  JwtPayload,
} from './types/authenticated-user';
import {
  generateEmailConfirmationCode,
  getEmailConfirmationCodeExpiresAt,
  hashEmailConfirmationCode,
} from './utils/email-confirmation-code';
import {
  generatePasswordResetCode,
  getPasswordResetCodeExpiresAt,
  hashPasswordResetCode,
} from './utils/password-reset-code';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const passwordHash = await hash(registerDto.password, 10);
    const code = generateEmailConfirmationCode();
    const email = normalizeEmail(registerDto.email);
    const emailConfirmationCodeSentAt = new Date();
    const emailConfirmationCodeExpiresAt = getEmailConfirmationCodeExpiresAt(
      this.getEmailConfirmationCodeExpiresInMinutes(),
    );
    const user = await this.usersService.create({
      name: registerDto.name,
      email,
      passwordHash,
      role: UserRole.USER,
      emailVerified: false,
      emailVerifiedAt: null,
      emailConfirmationCodeHash: hashEmailConfirmationCode(email, code),
      emailConfirmationCodeExpiresAt,
      emailConfirmationCodeSentAt,
      emailConfirmationAttempts: 0,
    });

    await this.sendEmailConfirmationCode(user.email, code);

    return {
      message: REGISTER_SUCCESS_MESSAGE,
      user: toSafeUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = normalizeEmail(loginDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw this.buildInvalidCredentialsException();
    }

    const passwordMatches = await compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      throw this.buildInvalidCredentialsException();
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        message: UNVERIFIED_EMAIL_MESSAGE,
        error: 'Forbidden',
      });
    }

    return this.buildAuthResponse(user);
  }

  async confirmEmail(confirmEmailDto: ConfirmEmailDto) {
    const normalizedEmail = normalizeEmail(confirmEmailDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw this.buildInvalidCodeException();
    }

    if (user.emailVerified) {
      return {
        message: CONFIRM_EMAIL_SUCCESS_MESSAGE,
      };
    }

    if (
      !user.emailConfirmationCodeHash ||
      !user.emailConfirmationCodeExpiresAt ||
      user.emailConfirmationCodeExpiresAt.getTime() < Date.now() ||
      user.emailConfirmationAttempts >= this.getEmailConfirmationMaxAttempts()
    ) {
      throw this.buildInvalidCodeException();
    }

    const codeHash = hashEmailConfirmationCode(normalizedEmail, confirmEmailDto.code);

    if (codeHash !== user.emailConfirmationCodeHash) {
      await this.usersService.incrementEmailConfirmationAttempts(user.id);
      throw this.buildInvalidCodeException();
    }

    await this.usersService.updateEmailVerification(user.id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailConfirmationCodeHash: null,
      emailConfirmationCodeExpiresAt: null,
      emailConfirmationCodeSentAt: null,
      emailConfirmationAttempts: 0,
    });

    return {
      message: CONFIRM_EMAIL_SUCCESS_MESSAGE,
    };
  }

  async resendConfirmation(
    resendEmailConfirmationDto: ResendEmailConfirmationDto,
  ) {
    const normalizedEmail = normalizeEmail(resendEmailConfirmationDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.emailVerified) {
      return {
        message: RESEND_CONFIRMATION_SUCCESS_MESSAGE,
      };
    }

    if (
      user.emailConfirmationCodeSentAt &&
      user.emailConfirmationCodeSentAt.getTime() +
        this.getEmailConfirmationResendCooldownSeconds() * 1_000 >
        Date.now()
    ) {
      throw new HttpException(
        {
          message: RESEND_CONFIRMATION_COOLDOWN_MESSAGE,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateEmailConfirmationCode();
    const emailConfirmationCodeSentAt = new Date();
    const emailConfirmationCodeExpiresAt = getEmailConfirmationCodeExpiresAt(
      this.getEmailConfirmationCodeExpiresInMinutes(),
    );

    await this.usersService.updateEmailConfirmation(user.id, {
      emailConfirmationCodeHash: hashEmailConfirmationCode(normalizedEmail, code),
      emailConfirmationCodeExpiresAt,
      emailConfirmationCodeSentAt,
      emailConfirmationAttempts: 0,
    });
    await this.sendEmailConfirmationCode(user.email, code);

    return {
      message: RESEND_CONFIRMATION_SUCCESS_MESSAGE,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const normalizedEmail = normalizeEmail(forgotPasswordDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      return {
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
      };
    }

    const code = generatePasswordResetCode();
    const passwordResetCodeSentAt = new Date();
    const passwordResetCodeExpiresAt = getPasswordResetCodeExpiresAt(
      this.getPasswordResetCodeExpiresInMinutes(),
    );

    await this.usersService.updatePasswordResetCode(user.id, {
      passwordResetCodeHash: hashPasswordResetCode(normalizedEmail, code),
      passwordResetCodeExpiresAt,
      passwordResetCodeSentAt,
      passwordResetAttempts: 0,
    });
    await this.sendPasswordResetCode(user.email, code);

    return {
      message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const normalizedEmail = normalizeEmail(resetPasswordDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (
      !user ||
      !user.passwordResetCodeHash ||
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt.getTime() < Date.now() ||
      user.passwordResetAttempts >= this.getPasswordResetMaxAttempts()
    ) {
      throw this.buildInvalidCodeException();
    }

    const codeHash = hashPasswordResetCode(normalizedEmail, resetPasswordDto.code);

    if (codeHash !== user.passwordResetCodeHash) {
      await this.usersService.incrementPasswordResetAttempts(user.id);
      throw this.buildInvalidCodeException();
    }

    const passwordHash = await hash(resetPasswordDto.password, 10);

    await this.usersService.updatePasswordHashAndClearResetCode(user.id, {
      passwordHash,
      passwordResetCodeHash: null,
      passwordResetCodeExpiresAt: null,
      passwordResetCodeSentAt: null,
      passwordResetAttempts: 0,
    });

    return {
      message: RESET_PASSWORD_SUCCESS_MESSAGE,
    };
  }

  async resendPasswordResetCode(
    resendPasswordResetCodeDto: ResendPasswordResetCodeDto,
  ) {
    const normalizedEmail = normalizeEmail(resendPasswordResetCodeDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      return {
        message: RESEND_PASSWORD_RESET_CODE_SUCCESS_MESSAGE,
      };
    }

    if (
      user.passwordResetCodeSentAt &&
      user.passwordResetCodeSentAt.getTime() +
        this.getPasswordResetResendCooldownSeconds() * 1_000 >
        Date.now()
    ) {
      throw new HttpException(
        {
          message: PASSWORD_RESET_COOLDOWN_MESSAGE,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generatePasswordResetCode();
    const passwordResetCodeSentAt = new Date();
    const passwordResetCodeExpiresAt = getPasswordResetCodeExpiresAt(
      this.getPasswordResetCodeExpiresInMinutes(),
    );

    await this.usersService.updatePasswordResetCode(user.id, {
      passwordResetCodeHash: hashPasswordResetCode(normalizedEmail, code),
      passwordResetCodeExpiresAt,
      passwordResetCodeSentAt,
      passwordResetAttempts: 0,
    });
    await this.sendPasswordResetCode(user.email, code);

    return {
      message: RESEND_PASSWORD_RESET_CODE_SUCCESS_MESSAGE,
    };
  }

  async getAuthenticatedUser(authenticatedUser: AuthenticatedUser) {
    const user = await this.usersService.findById(authenticatedUser.userId);

    if (!user) {
      throw new UnauthorizedException({
        message: 'Usu\u00e1rio autenticado n\u00e3o encontrado.',
        error: 'Unauthorized',
      });
    }

    return toSafeUser(user);
  }

  private async buildAuthResponse(
    user: Awaited<ReturnType<UsersService['findById']>>,
  ) {
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

  private getEmailConfirmationCodeExpiresInMinutes() {
    return this.configService.get<number>(
      'EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES',
      10,
    );
  }

  private getEmailConfirmationResendCooldownSeconds() {
    return this.configService.get<number>(
      'EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS',
      60,
    );
  }

  private getEmailConfirmationMaxAttempts() {
    return this.configService.get<number>('EMAIL_CONFIRMATION_MAX_ATTEMPTS', 5);
  }

  private getPasswordResetCodeExpiresInMinutes() {
    return this.configService.get<number>(
      'PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES',
      10,
    );
  }

  private getPasswordResetResendCooldownSeconds() {
    return this.configService.get<number>(
      'PASSWORD_RESET_RESEND_COOLDOWN_SECONDS',
      60,
    );
  }

  private getPasswordResetMaxAttempts() {
    return this.configService.get<number>('PASSWORD_RESET_MAX_ATTEMPTS', 5);
  }

  private async sendEmailConfirmationCode(email: string, code: string) {
    try {
      await this.mailService.sendEmailConfirmationCode(email, code);
    } catch {
      throw new ServiceUnavailableException({
        message: EMAIL_CONFIRMATION_SEND_FAILURE_MESSAGE,
        error: 'Service Unavailable',
      });
    }
  }

  private async sendPasswordResetCode(email: string, code: string) {
    try {
      await this.mailService.sendPasswordResetCode(email, code);
    } catch {
      throw new ServiceUnavailableException({
        message: PASSWORD_RESET_SEND_FAILURE_MESSAGE,
        error: 'Service Unavailable',
      });
    }
  }

  private buildInvalidCredentialsException() {
    return new UnauthorizedException({
      message: INVALID_CREDENTIALS_MESSAGE,
      error: 'Unauthorized',
    });
  }

  private buildInvalidCodeException() {
    return new BadRequestException({
      message: INVALID_CONFIRMATION_MESSAGE,
      error: 'Bad Request',
    });
  }
}
