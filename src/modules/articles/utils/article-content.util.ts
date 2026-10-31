import { Prisma } from '../../../generated/prisma/client';
import { calculateReadingTimeMinutes } from './reading-time.util';

export function normalizeArticleText(value: string) {
  return value.trim();
}

export function normalizeOptionalArticleText(value?: string | null) {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeArticleTags(tags?: string[]) {
  return (tags ?? []).map(tag => tag.trim()).filter(Boolean);
}

export function normalizeArticleBlockItems(
  items?: unknown[],
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return items === undefined ? Prisma.JsonNull : [...items] as Prisma.InputJsonValue;
}

export function resolveUploadedBlockImageText(
  submitted?: string,
  current?: string | null,
) {
  return normalizeOptionalArticleText(submitted) ?? current;
}

export function resolveArticleReadingTime(article: {
  content: string;
  readingTimeMinutes?: number | null;
  blocks?: Array<{
    title: string | null;
    body: string | null;
    items: Prisma.JsonValue | null;
  }>;
}) {
  if (article.readingTimeMinutes && article.readingTimeMinutes > 0) {
    return article.readingTimeMinutes;
  }

  const blockText = (article.blocks ?? [])
    .flatMap(block => {
      const itemsText = Array.isArray(block.items)
        ? block.items
            .map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
            .join(' ')
        : '';
      return [block.title ?? '', block.body ?? '', itemsText];
    })
    .join(' ');

  return calculateReadingTimeMinutes(
    [article.content, blockText].filter(Boolean).join(' '),
  );
}
