/**
 * ApprovalSync — Centralized HTTP Exception Filter
 * Formats all exceptions to the shared ApiErrorResponse contract.
 * Milestone: FND-02
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse, FieldError } from '../../shared/contracts';

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelation>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      request.correlationId ||
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'ERR_INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred.';
    let details: FieldError[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errorObj = res as Record<string, unknown>;
        message = (errorObj.message as string) || message;

        // Handle class-validator validation errors array
        if (Array.isArray(errorObj.message)) {
          code = 'ERR_VALIDATION_FAILED';
          message = 'One or more request parameters failed validation.';
          details = (errorObj.message as string[]).map((msg: string) => {
            const parts = msg.split(' ');
            return {
              field: parts[0] || 'parameter',
              message: msg,
            };
          });
        }
      }

      // Map HTTP status to standard error code if not already set
      if (code === 'ERR_INTERNAL_SERVER_ERROR') {
        code = this.mapStatusToErrorCode(status);
      }
    } else {
      // Unhandled non-HttpException error
      const err = exception as Error;
      this.logger.error(
        `[${correlationId}] Unhandled exception on ${request.method} ${request.url}: ${err?.message}`,
        err?.stack,
      );
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        correlationId,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorPayload);
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'ERR_BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'ERR_UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'ERR_FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'ERR_RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'ERR_CONCURRENCY_CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'ERR_PAYLOAD_TOO_LARGE';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'ERR_UNSUPPORTED_MEDIA_TYPE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'ERR_POLICY_VIOLATION';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'ERR_RATE_LIMITED';
      default:
        return 'ERR_INTERNAL_SERVER_ERROR';
    }
  }
}
