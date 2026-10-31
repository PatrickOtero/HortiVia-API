import type { Article } from '../../../generated/prisma/client';
import type { CreateArticleDto } from '../dto/create-article.dto';
import type { UpdateArticleDto } from '../dto/update-article.dto';

type PublicationInput = Pick<Article, 'isPublished' | 'publishedAt'>;

function resolvePublishedAt(
  isPublished: boolean,
  value: string | undefined,
  current: Date | null,
) {
  if (!isPublished) return null;
  if (value) return new Date(value);
  return current ?? new Date();
}

export function publicationForCreate(dto: CreateArticleDto) {
  const isPublished = dto.isPublished ?? false;
  return {
    isPublished,
    publishedAt: resolvePublishedAt(isPublished, dto.publishedAt, null),
  };
}

export function publicationForUpdate(
  existing: PublicationInput,
  dto: UpdateArticleDto,
) {
  if (dto.isPublished === undefined && dto.publishedAt === undefined) {
    return null;
  }

  const isPublished = dto.isPublished ?? existing.isPublished;
  return {
    isPublished,
    publishedAt: resolvePublishedAt(
      isPublished,
      dto.publishedAt,
      existing.publishedAt,
    ),
  };
}
