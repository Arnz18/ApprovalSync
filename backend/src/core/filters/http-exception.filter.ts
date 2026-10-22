/**
 * ApprovalSync — Centralized HTTP Exception Filter
 * Formats all exceptions to the shared ApiErrorResponse contract.
 * Milestone: BE-01
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiErrorResponse, FieldError } from '../../shared/contracts';
import { RequestWithCorrelation } from '../middleware/correlation.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelation>();

    const correlationId =
      request.correlationId ||
      (response.getHeader('X-Correlation-Id') as string) ||
      (request.headers['x-correlation-id'] as string) ||
      uuidv4();

    // Ensure correlation header is preserved in the response
    response.setHeader('X-Correlation-Id', correlationId);

    const sanitizedUrl = (request.originalUrl || request.url || '').replace(
      /[\r\n]/g,
      '',
    );
    const sanitizedMethod = (request.method || 'GET').replace(/[\r\n]/g, '');

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

        // Structured code provided by exception
        if (typeof errorObj.code === 'string') {
          code = errorObj.code;
        }

        // Structured details array provided by validation pipe
        if (Array.isArray(errorObj.details)) {
          details = errorObj.details as FieldError[];
          if (code === 'ERR_INTERNAL_SERVER_ERROR') {
            code = 'ERR_VALIDATION_FAILED';
          }
        } else if (Array.isArray(errorObj.message)) {
          // Fallback parsing for legacy or default class-validator string arrays
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

      // Map HTTP status to standard error code if not explicitly set
      if (code === 'ERR_INTERNAL_SERVER_ERROR') {
        code = this.mapStatusToErrorCode(status, message);
      }
    } else {
      // Unhandled non-HttpException error — log on server, never leak stack trace to client
      const err = exception as Error;
      this.logger.error(
        `[${correlationId}] Unhandled exception on ${sanitizedMethod} ${sanitizedUrl}: ${err?.message}`,
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
        path: sanitizedUrl,
        correlationId,
        ...(details && details.length > 0 ? { details } : {}),
      },
    };

    response.status(status).json(errorPayload);
  }

  private mapStatusToErrorCode(status: number, message?: string): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST: {
        if (
          message &&
          (message.includes('JSON') ||
            message.includes('SyntaxError') ||
            message.includes('Unexpected token') ||
            message.includes('malformed'))
        ) {
          return 'ERR_MALFORMED_REQUEST';
        }
        return 'ERR_BAD_REQUEST';
      }
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
      case HttpStatus.BAD_GATEWAY:
        return 'ERR_ADAPTER_UNAVAILABLE';
      default:
        return 'ERR_INTERNAL_SERVER_ERROR';
    }
  }
}
