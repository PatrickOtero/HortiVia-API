import { HttpException, HttpStatus } from '@nestjs/common';

export class ApplicationException extends HttpException {
  constructor(
    message: string | string[],
    error = 'Application Error',
    status = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode: status,
        message,
        error,
      },
      status,
    );
  }
}
