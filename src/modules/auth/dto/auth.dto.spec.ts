import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { STRONG_PASSWORD_VALIDATION_MESSAGE } from '../../../common/validators/password.validator';
import { ConfirmEmailDto } from './confirm-email.dto';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { ResendEmailConfirmationDto } from './resend-email-confirmation.dto';

async function getValidationMessages(input: object, dto: new () => object) {
  const instance = plainToInstance(dto, input);
  const errors = await validate(instance);

  return errors.flatMap(error => Object.values(error.constraints ?? {}));
}

describe('Auth DTO validation', () => {
  it('register rejects an invalid e-mail', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'invalid-email',
          password: 'SenhaForte@123',
        },
        RegisterDto,
      ),
    ).resolves.toContain('Informe um e-mail v\u00e1lido.');
  });

  it('register trims and lowercases the e-mail', () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Patrick',
      email: '  Patrick@Email.com  ',
      password: 'SenhaForte@123',
    });

    expect(dto.email).toBe('patrick@email.com');
  });

  it('register rejects a password without uppercase', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'senhaforte@123',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password without lowercase', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'SENHAFORTE@123',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password without number', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'SenhaForte@abc',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password without special character', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'SenhaForte123',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password shorter than 10 characters', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'S@1enha',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password longer than 72 characters', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: `${'SenhaForte@123'.repeat(6)}Senha`,
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password with leading or trailing whitespace', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: ' SenhaForte@123 ',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register rejects a password with line breaks', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'Senha\nForte@123',
        },
        RegisterDto,
      ),
    ).resolves.toContain(STRONG_PASSWORD_VALIDATION_MESSAGE);
  });

  it('register accepts a valid strong password', async () => {
    await expect(
      getValidationMessages(
        {
          name: 'Patrick',
          email: 'patrick@email.com',
          password: 'SenhaForte@123',
        },
        RegisterDto,
      ),
    ).resolves.toHaveLength(0);
  });

  it('login trims and lowercases the e-mail', () => {
    const dto = plainToInstance(LoginDto, {
      email: '  Patrick@Email.com  ',
      password: 'legacy-password',
    });

    expect(dto.email).toBe('patrick@email.com');
  });

  it('confirm e-mail normalizes the e-mail', () => {
    const dto = plainToInstance(ConfirmEmailDto, {
      email: '  Patrick@Email.com  ',
      code: '123456',
    });

    expect(dto.email).toBe('patrick@email.com');
  });

  it('confirm e-mail requires a 6-digit code', async () => {
    await expect(
      getValidationMessages(
        {
          email: 'patrick@email.com',
          code: '12A34',
        },
        ConfirmEmailDto,
      ),
    ).resolves.toContain('C\u00f3digo inv\u00e1lido ou expirado.');
  });

  it('resend confirmation trims and lowercases the e-mail', () => {
    const dto = plainToInstance(ResendEmailConfirmationDto, {
      email: '  Patrick@Email.com  ',
    });

    expect(dto.email).toBe('patrick@email.com');
  });
});
