import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ArticleBlockUploadIntentsRepository } from '../src/modules/articles/article-block-upload-intents.repository';
import { PresignedUploadReconciliationService } from '../src/modules/articles/presigned-upload-reconciliation.service';
import { ManagedImageReferencesRepository } from '../src/modules/storage/managed-image-references.repository';
import { CloudflareR2StorageService } from '../src/modules/storage/cloudflare-r2-storage.service';
import { StorageService } from '../src/modules/storage/storage.service';
import { PRESIGNED_UPLOAD_DEFAULT_GRACE_MINUTES } from '../src/modules/storage/presigned-upload.constants';
import type { PrismaService } from '../src/prisma/prisma.service';

function describeTarget(connectionString: string) {
  const target = new URL(connectionString);
  const database = decodeURIComponent(target.pathname.slice(1).split('/')[0]);
  return { host: target.hostname, database };
}

async function main() {
  const connectionString = process.env.PRESIGNED_UPLOAD_RECONCILIATION_DATABASE_URL;
  const confirmation = process.argv.find(value => value.startsWith('--confirm-target='))?.slice('--confirm-target='.length);
  if (!connectionString) {
    throw new Error('Defina PRESIGNED_UPLOAD_RECONCILIATION_DATABASE_URL explicitamente; DATABASE_URL não é usado.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O diagnóstico de uploads não pode ser executado com NODE_ENV=production.');
  }

  const target = describeTarget(connectionString);
  const targetLabel = `${target.host}/${target.database}`;
  if (confirmation !== targetLabel) {
    throw new Error(`Confirme o banco somente leitura com --confirm-target=${targetLabel}`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const config = new ConfigService(process.env);
    const cloudflare = new CloudflareR2StorageService(config);
    const storage = new StorageService(cloudflare);
    const intents = new ArticleBlockUploadIntentsRepository(prisma as unknown as PrismaService);
    const references = new ManagedImageReferencesRepository(prisma as unknown as PrismaService);
    const reconciliation = new PresignedUploadReconciliationService(intents, references, storage);
    const rawGrace = Number(process.env.PRESIGNED_UPLOAD_RECONCILIATION_GRACE_MINUTES);
    const graceMinutes = Number.isFinite(rawGrace) && rawGrace >= 0
      ? rawGrace
      : PRESIGNED_UPLOAD_DEFAULT_GRACE_MINUTES;
    const report = await reconciliation.diagnose({ graceMinutes });
    process.stdout.write(`${JSON.stringify({ target: targetLabel, mode: 'diagnostic-only', graceMinutes, ...report }, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  const name = error instanceof Error ? error.name : 'UnknownError';
  process.stderr.write(`Presigned upload reconciliation failed (${name}). No objects were deleted.\n`);
  process.exitCode = 1;
});
