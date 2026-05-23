import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { getMailConfiguration } from './mail.config';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly emailConfirmationCodeExpiresInMinutes: number;

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
  }

  async sendEmailConfirmationCode(to: string, code: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Seu c\u00f3digo de confirma\u00e7\u00e3o do HortiVia',
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
}

function buildEmailConfirmationText(code: string, expiresInMinutes: number) {
  return [
    'Ol\u00e1,',
    '',
    'Use o c\u00f3digo abaixo para confirmar seu e-mail no HortiVia:',
    '',
    code,
    '',
    `Esse c\u00f3digo expira em ${expiresInMinutes} minutos.`,
    '',
    'Se voc\u00ea n\u00e3o criou essa conta, ignore esta mensagem.',
  ].join('\n');
}

function buildEmailConfirmationHtml(code: string, expiresInMinutes: number) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1F3026; line-height: 1.6;">
      <p>Ol&aacute;,</p>
      <p>Use o c&oacute;digo abaixo para confirmar seu e-mail no HortiVia:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 24px 0;">
        ${code}
      </p>
      <p>Esse c&oacute;digo expira em ${expiresInMinutes} minutos.</p>
      <p>Se voc&ecirc; n&atilde;o criou essa conta, ignore esta mensagem.</p>
    </div>
  `;
}
