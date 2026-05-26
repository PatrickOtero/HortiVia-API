import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ProductGuideSectionKind,
  ProductImageKind,
} from '../src/generated/prisma/enums';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY;
const secretAccessKey = process.env.CLOUDFLARE_ACCESS_SECRET_KEY;
const publicBaseUrl = process.env.CLOUDFLARE_PUBLIC_BASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

if (!bucketName || !accountId || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
  throw new Error('Cloudflare R2 environment variables are required.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const GALLERY_KIND_ORDER = [
  ProductImageKind.HERO,
  ProductImageKind.WHOLE,
  ProductImageKind.CUT,
  ProductImageKind.DEFECT,
] as const;

const GUIDE_KIND_ORDER = [
  ProductGuideSectionKind.CHOOSE,
  ProductGuideSectionKind.STORE,
  ProductGuideSectionKind.USE,
] as const;

type ProductStorageAssets = {
  topLevel: string[];
  galleryByLegacyId: Map<string, string[]>;
  guideByLegacyId: Map<string, string[]>;
};

function extractTimestampFromKey(key: string) {
  const keyParts = key.split('/');
  const filename = keyParts[keyParts.length - 1] ?? '';
  const timestamp = Number.parseInt(filename.split('-')[0] ?? '', 10);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toPublicUrl(key: string) {
  return `${publicBaseUrl}/${key}`;
}

function getLatestKey(keys: string[]) {
  return [...keys].sort(
    (left, right) => extractTimestampFromKey(right) - extractTimestampFromKey(left),
  )[0];
}

function normalizeTextList(values: string[]) {
  return values.map(value => value.trim()).filter(Boolean);
}

function buildSectionContent(kind: (typeof GUIDE_KIND_ORDER)[number], product: {
  howToChoose: string[];
  howToStore: string[];
  usageTips: string[];
}) {
  if (kind === ProductGuideSectionKind.CHOOSE) {
    return {
      title: 'Como escolher',
      bullets: normalizeTextList(product.howToChoose),
    };
  }

  if (kind === ProductGuideSectionKind.STORE) {
    return {
      title: 'Como conservar',
      bullets: normalizeTextList(product.howToStore),
    };
  }

  return {
    title: 'Como aproveitar',
    bullets: normalizeTextList(product.usageTips),
  };
}

function buildSectionBody(bullets: string[], title: string) {
  if (bullets.length > 0) {
    return bullets.join(' ');
  }

  if (title === 'Como escolher') {
    return 'Veja o aspecto do alimento e observe sinais de frescor antes de levar.';
  }

  if (title === 'Como conservar') {
    return 'Guarde do jeito certo para preservar sabor, textura e durabilidade.';
  }

  return 'Use no dia a dia em preparos simples, aproveitando melhor o alimento.';
}

function selectGalleryKeys(keys: string[]) {
  if (keys.length <= 4) {
    return keys;
  }

  return [keys[0], keys[1], keys[2], keys[keys.length - 1]];
}

function selectGuideKeys(keys: string[]) {
  if (keys.length >= 4) {
    return [keys[0], keys[2], keys[3]];
  }

  return keys.slice(0, 3);
}

async function listProductAssets() {
  const assetsByProductId = new Map<string, ProductStorageAssets>();
  let continuationToken: string | undefined;

  do {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'products/',
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of result.Contents ?? []) {
      const key = item.Key;

      if (!key) {
        continue;
      }

      const parts = key.split('/');
      const productId = parts[1];

      if (!productId) {
        continue;
      }

      const productAssets =
        assetsByProductId.get(productId) ??
        {
          topLevel: [],
          galleryByLegacyId: new Map<string, string[]>(),
          guideByLegacyId: new Map<string, string[]>(),
        };

      if (parts.length === 3) {
        productAssets.topLevel.push(key);
      } else if (parts[2] === 'gallery' && parts[3]) {
        const galleryKeys = productAssets.galleryByLegacyId.get(parts[3]) ?? [];
        galleryKeys.push(key);
        productAssets.galleryByLegacyId.set(parts[3], galleryKeys);
      } else if (parts[2] === 'guide-sections' && parts[3]) {
        const guideKeys = productAssets.guideByLegacyId.get(parts[3]) ?? [];
        guideKeys.push(key);
        productAssets.guideByLegacyId.set(parts[3], guideKeys);
      }

      assetsByProductId.set(productId, productAssets);
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return assetsByProductId;
}

async function main() {
  const assetsByProductId = await listProductAssets();
  const products = await prisma.product.findMany({
    include: {
      images: {
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      },
      guideSections: {
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  let restoredProductImages = 0;
  let restoredGalleryImages = 0;
  let restoredGuideImages = 0;
  let removedObserveSections = 0;
  const manualReviewProducts: string[] = [];

  for (const product of products) {
    const assets = assetsByProductId.get(product.id);

    if (!assets) {
      continue;
    }

    if (assets.topLevel.length > 0) {
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          imageUrl: toPublicUrl(getLatestKey(assets.topLevel)),
        },
      });
      restoredProductImages += 1;
    }

    const galleryKeys = [...assets.galleryByLegacyId.values()]
      .map(keys => getLatestKey(keys))
      .sort((left, right) => extractTimestampFromKey(left) - extractTimestampFromKey(right));
    const selectedGalleryKeys = selectGalleryKeys(galleryKeys);

    await prisma.productImage.deleteMany({
      where: {
        productId: product.id,
      },
    });

    if (selectedGalleryKeys.length > 0) {
      await prisma.productImage.createMany({
        data: selectedGalleryKeys.map((key, index) => ({
          productId: product.id,
          url: toPublicUrl(key),
          alt: null,
          caption: null,
          kind: GALLERY_KIND_ORDER[index] ?? ProductImageKind.DEFECT,
          sortOrder: index,
          isPrimary: index === 0,
        })),
      });

      restoredGalleryImages += selectedGalleryKeys.length;
    }

    const guideKeys = [...assets.guideByLegacyId.values()]
      .map(keys => getLatestKey(keys))
      .sort((left, right) => extractTimestampFromKey(left) - extractTimestampFromKey(right));
    const selectedGuideKeys = selectGuideKeys(guideKeys);

    const sectionsByKind = new Map(
      product.guideSections.map(section => [section.kind, section] as const),
    );

    if (sectionsByKind.has(ProductGuideSectionKind.OBSERVE)) {
      await prisma.productGuideSection.deleteMany({
        where: {
          productId: product.id,
          kind: ProductGuideSectionKind.OBSERVE,
        },
      });
      removedObserveSections += 1;
    }

    for (let index = 0; index < GUIDE_KIND_ORDER.length; index += 1) {
      const kind = GUIDE_KIND_ORDER[index];
      const section = sectionsByKind.get(kind);
      const imageUrl = selectedGuideKeys[index]
        ? toPublicUrl(selectedGuideKeys[index])
        : null;
      const content = buildSectionContent(kind, product);
      const body = buildSectionBody(content.bullets, content.title);

      if (section) {
        await prisma.productGuideSection.update({
          where: {
            id: section.id,
          },
          data: {
            title: content.title,
            body,
            bullets: content.bullets,
            idealPoints: [],
            avoidPoints: [],
            sortOrder: index,
            imageUrl,
          },
        });
      } else if (imageUrl || content.bullets.length > 0) {
        await prisma.productGuideSection.create({
          data: {
            productId: product.id,
            kind,
            title: content.title,
            body,
            bullets: content.bullets,
            idealPoints: [],
            avoidPoints: [],
            sortOrder: index,
            imageUrl,
            imageAlt: null,
            imageCaption: null,
          },
        });
      }

      if (imageUrl) {
        restoredGuideImages += 1;
      }
    }

    const hasUnexpectedGuideCount =
      guideKeys.length > 0 && ![3, 4].includes(guideKeys.length);

    if (hasUnexpectedGuideCount || galleryKeys.length > 4) {
      manualReviewProducts.push(product.name);
    }
  }

  console.log(
    JSON.stringify(
      {
        restoredProductImages,
        restoredGalleryImages,
        restoredGuideImages,
        removedObserveSections,
        manualReviewProducts: [...new Set(manualReviewProducts)].sort(),
      },
      null,
      2,
    ),
  );
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    await prisma.$disconnect();
    throw error;
  });
