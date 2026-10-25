import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logInternalError(exception, request);
    }

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const responseBody = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        message = responseBody.message ?? message;
        error = responseBody.error ?? exception.name;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private logInternalError(exception: unknown, request: Request) {
    const metadata = getSafeErrorMetadata(exception);
    const route = request.route?.path;
    const path = route
      ? `${request.baseUrl ?? ''}${route}`
      : '<unmatched route>';
    const details = metadata.length > 0 ? ` (${metadata.join('; ')})` : '';
    const message = `Unhandled server error for ${request.method} ${path}${details}`;
    const stack = exception instanceof Error
      ? exception.stack?.split('\n').slice(1, 9).join('\n')
      : undefined;

    this.logger.error(message, stack);
  }
}

function getSafeErrorMetadata(exception: unknown) {
  const metadata: string[] = [];
  const visited = new Set<unknown>();
  let current: unknown = exception;

  while (current && typeof current === 'object' && !visited.has(current) && metadata.length < 5) {
    visited.add(current);

    const error = current as {
      name?: unknown;
      code?: unknown;
      cause?: unknown;
    };
    const name = typeof error.name === 'string'
      ? error.name.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64)
      : 'Error';
    const code = typeof error.code === 'string' && /^[a-zA-Z0-9_.-]{1,32}$/.test(error.code)
      ? ` code=${error.code}`
      : '';

    metadata.push(`${name}${code}`);
    current = error.cause;
  }

  return metadata;
}
