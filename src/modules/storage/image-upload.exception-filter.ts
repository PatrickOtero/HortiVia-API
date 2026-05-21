import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class ImageUploadExceptionFilter implements ExceptionFilter {
  constructor(private readonly maxFileSizeLabel: string) {}

  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `A imagem deve ter no maximo ${this.maxFileSizeLabel}.`,
        error: 'Bad Request',
      });

      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Envie uma imagem valida.',
      error: 'Bad Request',
    });
  }
}
