import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../../storage/image-upload.constants';
import type { UploadFile } from '../../storage/types/upload-file';

export function validateArticleImageFile(file?: UploadFile): UploadFile {
  if (!file) {
    throw new BadRequestException({
      message: 'Envie uma imagem válida.',
      error: 'Bad Request',
    });
  }
  if (file.size > CONTENT_IMAGE_MAX_FILE_SIZE) {
    throw new BadRequestException({
      message: 'A imagem deve ter no máximo 5 MB.',
      error: 'Bad Request',
    });
  }
  if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(file.mimeType)) {
    throw new BadRequestException({
      message: 'Formato de imagem não permitido.',
      error: 'Bad Request',
    });
  }
  return file;
}
