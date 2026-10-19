import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('MailService', () => {
  const sendMail = jest.fn();
  const configValues: Record<string, string> = {
    NODEMAILER_HOST: 'smtp.test.invalid',
    NODEMAILER_PORT: '587',
    NODEMAILER_SECURE: 'false',
    NODEMAILER_REQUIRE_TLS: 'true',
    NODEMAILER_USER: 'test-user',
    NODEMAILER_PASS: 'test-password',
    NODEMAILER_FROM: 'HortiVia <no-reply@hortivia.test>',
  };

  let service: MailService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createTransport).mockReturnValue({ sendMail } as never);
    sendMail.mockResolvedValue({ messageId: 'local-test-message' });

    const configService = {
      getOrThrow: jest.fn((key: string) => configValues[key]),
      get: jest.fn((key: string) =>
        key.endsWith('_MINUTES') ? 10 : undefined,
      ),
    } as unknown as ConfigService;

    service = new MailService(configService);
  });

  it('creates the existing SMTP transport with explicit TLS and authentication settings', () => {
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.invalid',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'test-user', pass: 'test-password' },
    });
  });

  it('sends the email confirmation code with fixed headers and the existing text and HTML content', async () => {
    await service.sendEmailConfirmationCode('person@example.com', '123456');

    expect(sendMail).toHaveBeenCalledWith({
      from: 'HortiVia <no-reply@hortivia.test>',
      to: 'person@example.com',
      subject: 'Seu código de confirmação do HortiVia',
      text: expect.stringContaining('123456'),
      html: expect.stringContaining('123456'),
    });
    const message = sendMail.mock.calls[0][0];
    expect(message.text).toContain('expira em 10 minutos');
    expect(message.html).toContain('expira em 10 minutos');
    expect(message).not.toHaveProperty('headers');
    expect(message).not.toHaveProperty('raw');
  });

  it('sends the password reset code without adding user-controlled headers', async () => {
    await service.sendPasswordResetCode('person@example.com', '654321');

    expect(sendMail).toHaveBeenCalledWith({
      from: 'HortiVia <no-reply@hortivia.test>',
      to: 'person@example.com',
      subject: 'Seu código para redefinir a senha no HortiVia',
      text: expect.stringContaining('654321'),
      html: expect.stringContaining('654321'),
    });
    const message = sendMail.mock.calls[0][0];
    expect(message.text).toContain('expira em 10 minutos');
    expect(message.html).toContain('expira em 10 minutos');
    expect(message).not.toHaveProperty('headers');
    expect(message).not.toHaveProperty('raw');
  });

  it('propagates SMTP transport failures to the caller', async () => {
    const smtpError = new Error('SMTP connection refused');
    sendMail.mockRejectedValueOnce(smtpError);

    await expect(
      service.sendEmailConfirmationCode('person@example.com', '123456'),
    ).rejects.toBe(smtpError);
  });
});
