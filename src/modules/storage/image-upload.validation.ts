import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from './image-upload.constants';
import type { UploadFile } from './types/upload-file';

export function validateContentImageFile(file?: UploadFile): UploadFile {
  if (!file) {
    throw new BadRequestException({
      message: 'Envie uma imagem v\u00e1lida.',
      error: 'Bad Request',
    });
  }
  if (file.size > CONTENT_IMAGE_MAX_FILE_SIZE) {
    throw new BadRequestException({
      message: 'A imagem deve ter no m\u00e1ximo 5 MB.',
      error: 'Bad Request',
    });
  }
  if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(file.mimeType)) {
    throw new BadRequestException({
      message: 'Formato de imagem n\u00e3o permitido.',
      error: 'Bad Request',
    });
  }
  return file;
}
