import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';

function getCliOption(name: string, shortName?: string) {
  const args = process.argv.slice(2);
  const longOptionIndex = args.findIndex(arg => arg === `--${name}`);

  if (longOptionIndex >= 0) {
    return args[longOptionIndex + 1];
  }

  if (!shortName) {
    return undefined;
  }

  const shortOptionIndex = args.findIndex(arg => arg === `-${shortName}`);

  if (shortOptionIndex >= 0) {
    return args[shortOptionIndex + 1];
  }

  return undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const emailInput = getCliOption('email', 'e');

  if (!emailInput) {
    throw new Error(
      'Informe o e-mail do usuário. Exemplo: npm run admin:promote -- --email pessoa@exemplo.com',
    );
  }

  const email = normalizeEmail(emailInput);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
    }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado para promoção.');
    }

    if (user.role === UserRole.ADMIN) {
      console.info(`Usuário ${user.email} já possui a função ADMIN.`);
      return;
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        role: UserRole.ADMIN,
      },
    });

    console.info(`Usuário ${user.email} promovido para ADMIN com sucesso.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
