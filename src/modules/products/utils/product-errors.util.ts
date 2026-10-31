import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export function isProductPrismaError(error: unknown, code: 'P2002' | 'P2025') {
  return !!error && typeof error === 'object' && 'code' in error &&
    (error as { code?: string }).code === code;
}

export function productNotFoundException() {
  return new NotFoundException({
    message: 'Produto n\u00e3o encontrado.',
    error: 'Not Found',
  });
}

export function productImageNotFoundException() {
  return new NotFoundException({
    message: 'Imagem do produto n\u00e3o encontrada.',
    error: 'Not Found',
  });
}

export function productGuideSectionNotFoundException() {
  return new NotFoundException({
    message: 'Se\u00e7\u00e3o do produto n\u00e3o encontrada.',
    error: 'Not Found',
  });
}

export function productSlugConflictException() {
  return new ConflictException({
    message: 'N\u00e3o foi poss\u00edvel salvar o produto com um slug \u00fanico.',
    error: 'Conflict',
  });
}

export function articleNotFoundForProductException() {
  return new NotFoundException({
    message: 'Artigo n\u00e3o encontrado.',
    error: 'Not Found',
  });
}

export function productArticleRelationNotFoundException() {
  return new NotFoundException({
    message: 'Rela\u00e7\u00e3o entre produto e artigo n\u00e3o encontrada.',
    error: 'Not Found',
  });
}
