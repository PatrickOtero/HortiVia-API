import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export function isPrismaErrorCode(error: unknown, code: string) {
  return !!error && typeof error === 'object' && 'code' in error &&
    (error as { code?: string }).code === code;
}

export function articleNotFoundException(cause?: unknown) {
  return new NotFoundException({
    message: 'Artigo não encontrado.',
    error: 'Not Found',
  }, cause ? { cause } : undefined);
}

export function articleBlockNotFoundException(cause?: unknown) {
  return new NotFoundException({
    message: 'Bloco do artigo não encontrado.',
    error: 'Not Found',
  }, cause ? { cause } : undefined);
}

export function articleCommentNotFoundException() {
  return new NotFoundException({
    message: 'Comentario nao encontrado.',
    error: 'Not Found',
  });
}

export function articleCommentOwnerForbiddenException() {
  return new ForbiddenException({
    message: 'Voce nao pode gerenciar este comentario.',
    error: 'Forbidden',
  });
}

export function articleCommentEditForbiddenException() {
  return new ForbiddenException({
    message: 'Este comentario nao pode mais ser editado.',
    error: 'Forbidden',
  });
}

export function articleSlugConflictException() {
  return new ConflictException({
    message: 'Não foi possível salvar o artigo com um slug único.',
    error: 'Conflict',
  });
}
