/**
 * ApprovalSync — HTTP Exception Filter Unit Tests
 * Milestone: BE-01
 */

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ArgumentsHost,
} from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';
import { Response } from 'express';
import { RequestWithCorrelation } from '../middleware/correlation.middleware';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockRequest: Partial<RequestWithCorrelation>;
  let mockResponse: Partial<Response>;
  let mockHost: ArgumentsHost;
  let responseJson: Record<string, unknown>;
  let responseStatusCode: number;
  let responseHeaders: Record<string, string>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    responseJson = {};
    responseStatusCode = 200;
    responseHeaders = {};

    mockResponse = {
      status: jest.fn().mockImplementation((code: number) => {
        responseStatusCode = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((payload: Record<string, unknown>) => {
        responseJson = payload;
        return mockResponse;
      }),
      setHeader: jest.fn().mockImplementation((key: string, value: string) => {
        responseHeaders[key] = value;
      }),
      getHeader: jest
        .fn()
        .mockImplementation((key: string) => responseHeaders[key]),
    };

    mockRequest = {
      url: '/api/v1/test',
      originalUrl: '/api/v1/test',
      method: 'GET',
      headers: {},
      correlationId: 'test-corr-uuid-1234',
    };

    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format NotFoundException into standard 404 ApiErrorResponse envelope', () => {
    const exception = new NotFoundException('Cannot GET /api/v1/non-existent');

    filter.catch(exception, mockHost);

    expect(responseStatusCode).toBe(404);
    expect(responseJson).toMatchObject({
      success: false,
      error: {
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: 'Cannot GET /api/v1/non-existent',
        statusCode: 404,
        path: '/api/v1/test',
        correlationId: 'test-corr-uuid-1234',
      },
    });
    expect(responseHeaders['X-Correlation-Id']).toBe('test-corr-uuid-1234');
  });

  it('should format validation failure with structured details array', () => {
    const exception = new BadRequestException({
      code: 'ERR_VALIDATION_FAILED',
      message: 'One or more request parameters failed validation.',
      details: [
        {
          field: 'landAreaAcres',
          message: 'landAreaAcres must be a positive number',
          rule: 'isPositive',
        },
      ],
    });

    filter.catch(exception, mockHost);

    expect(responseStatusCode).toBe(400);
    expect(responseJson).toMatchObject({
      success: false,
      error: {
        code: 'ERR_VALIDATION_FAILED',
        message: 'One or more request parameters failed validation.',
        statusCode: 400,
        path: '/api/v1/test',
        correlationId: 'test-corr-uuid-1234',
        details: [
          {
            field: 'landAreaAcres',
            message: 'landAreaAcres must be a positive number',
            rule: 'isPositive',
          },
        ],
      },
    });
  });

  it('should map malformed JSON syntax error to ERR_MALFORMED_REQUEST', () => {
    const exception = new BadRequestException(
      'Unexpected token } in JSON at position 42',
    );

    filter.catch(exception, mockHost);

    expect(responseStatusCode).toBe(400);
    expect(responseJson).toMatchObject({
      success: false,
      error: {
        code: 'ERR_MALFORMED_REQUEST',
        statusCode: 400,
      },
    });
  });

  it('should format 401 UnauthorizedException to ERR_UNAUTHORIZED', () => {
    const exception = new UnauthorizedException('Missing authentication token');

    filter.catch(exception, mockHost);

    expect(responseStatusCode).toBe(401);
    expect(responseJson).toMatchObject({
      success: false,
      error: {
        code: 'ERR_UNAUTHORIZED',
        statusCode: 401,
      },
    });
  });

  it('should format 403 ForbiddenException to ERR_FORBIDDEN', () => {
    const exception = new ForbiddenException('Insufficient permissions');

    filter.catch(exception, mockHost);

    expect(responseStatusCode).toBe(403);
    expect(responseJson).toMatchObject({
      success: false,
      error: {
        code: 'ERR_FORBIDDEN',
        statusCode: 403,
      },
    });
  });

  it('should format unhandled non-HttpException safely as 500 without leaking stack trace', () => {
    const exception = new Error(
      'Database connection failed: password=secret_password host=internal-db',
    );

    filter.catch(exception, mockHost);

    expect(responseStatusCode).toBe(500);
    expect(responseJson).toMatchObject({
      success: false,
      error: {
        code: 'ERR_INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
        statusCode: 500,
        path: '/api/v1/test',
        correlationId: 'test-corr-uuid-1234',
      },
    });

    const errorPayload = (responseJson as { error: Record<string, unknown> })
      .error;
    expect(errorPayload.stack).toBeUndefined();
    expect(JSON.stringify(responseJson)).not.toContain('secret_password');
    expect(JSON.stringify(responseJson)).not.toContain('internal-db');
  });

  it('should sanitize CR/LF characters in request path to prevent header/log injection', () => {
    mockRequest.url = '/api/v1/test\r\nX-Injected-Header: evil\n';
    mockRequest.originalUrl = '/api/v1/test\r\nX-Injected-Header: evil\n';

    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost);

    const errorPayload = (responseJson as { error: { path: string } }).error;
    expect(errorPayload.path).not.toContain('\r');
    expect(errorPayload.path).not.toContain('\n');
    expect(errorPayload.path).toBe('/api/v1/testX-Injected-Header: evil');
  });
});
