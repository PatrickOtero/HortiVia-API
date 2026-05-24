import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { getMailConfiguration } from './mail.config';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly emailConfirmationCodeExpiresInMinutes: number;
  private readonly passwordResetCodeExpiresInMinutes: number;

  constructor(configService: ConfigService) {
    const mailConfiguration = getMailConfiguration(configService);

    this.transporter = createTransport({
      host: mailConfiguration.host,
      port: mailConfiguration.port,
      secure: mailConfiguration.secure,
      requireTLS: mailConfiguration.requireTLS,
      auth: {
        user: mailConfiguration.user,
        pass: mailConfiguration.pass,
      },
    });
    this.from = mailConfiguration.from;
    this.emailConfirmationCodeExpiresInMinutes =
      configService.get<number>('EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES') ??
      10;
    this.passwordResetCodeExpiresInMinutes =
      configService.get<number>('PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES') ?? 10;
  }

  async sendEmailConfirmationCode(to: string, code: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Seu código de confirmação do HortiVia',
      text: buildEmailConfirmationText(
        code,
        this.emailConfirmationCodeExpiresInMinutes,
      ),
      html: buildEmailConfirmationHtml(
        code,
        this.emailConfirmationCodeExpiresInMinutes,
      ),
    });
  }

  async sendPasswordResetCode(to: string, code: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Seu código para redefinir a senha no HortiVia',
      text: buildPasswordResetText(code, this.passwordResetCodeExpiresInMinutes),
      html: buildPasswordResetHtml(code, this.passwordResetCodeExpiresInMinutes),
    });
  }
}

function buildEmailConfirmationText(code: string, expiresInMinutes: number) {
  return [
    'Olá,',
    '',
    'Use o código abaixo para confirmar seu e-mail no HortiVia:',
    '',
    code,
    '',
    `Esse código expira em ${expiresInMinutes} minutos.`,
    '',
    'Se você não criou essa conta, ignore esta mensagem.',
  ].join('\n');
}

function buildEmailConfirmationHtml(code: string, expiresInMinutes: number) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1F3026; line-height: 1.6;">
      <p>Olá,</p>
      <p>Use o código abaixo para confirmar seu e-mail no HortiVia:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 24px 0;">
        ${code}
      </p>
      <p>Esse código expira em ${expiresInMinutes} minutos.</p>
      <p>Se você não criou essa conta, ignore esta mensagem.</p>
    </div>
  `;
}

function buildPasswordResetText(code: string, expiresInMinutes: number) {
  return [
    'Olá,',
    '',
    'Use o código abaixo para redefinir sua senha no HortiVia:',
    '',
    code,
    '',
    `Esse código expira em ${expiresInMinutes} minutos.`,
    '',
    'Se você não solicitou essa alteração, ignore esta mensagem.',
  ].join('\n');
}

function buildPasswordResetHtml(code: string, expiresInMinutes: number) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1F3026; line-height: 1.6;">
      <p>Olá,</p>
      <p>Use o código abaixo para redefinir sua senha no HortiVia:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 24px 0;">
        ${code}
      </p>
      <p>Esse código expira em ${expiresInMinutes} minutos.</p>
      <p>Se você não solicitou essa alteração, ignore esta mensagem.</p>
    </div>
  `;
}
