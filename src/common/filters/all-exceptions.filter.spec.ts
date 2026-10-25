import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerError: jest.SpyInstance;
  let response: { status: jest.Mock; json: jest.Mock };
  let request: Partial<Request>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    request = {
      method: 'GET',
      baseUrl: '',
      route: { path: '/products' } as Request['route'],
      url: '/products?token=private-query-value',
    };
    host = {
      switchToHttp: () => ({
        getResponse: () => response as unknown as Response,
        getRequest: () => request as Request,
      }),
    } as ArgumentsHost;
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  it('logs safe diagnostic metadata for server errors without exposing error details', () => {
    const cause = Object.assign(new Error('password=private-value'), {
      code: 'ECONNREFUSED',
    });
    const exception = Object.assign(
      new Error('postgresql://user:private-secret@db.example/app'),
      { code: 'P1001', cause },
    );

    filter.catch(exception, host);

    expect(loggerError).toHaveBeenCalledWith(
      'Unhandled server error for GET /products (Error code=P1001; Error code=ECONNREFUSED)',
      expect.any(String),
    );
    const responseBody = response.json.mock.calls[0][0] as {
      message: string;
      error: string;
    };
    expect(responseBody.message).not.toContain('private');
    expect(responseBody.error).not.toContain('private');
    expect(JSON.stringify(loggerError.mock.calls[0])).not.toContain('private');
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      path: request.url,
    }));
  });

  it('preserves client error responses and does not log them as server failures', () => {
    filter.catch(new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED), host);

    expect(loggerError).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Unauthorized',
    }));
  });
});
