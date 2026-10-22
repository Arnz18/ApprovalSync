/**
 * ApprovalSync — Structured Logging & Correlation Interceptor
 * Milestone: BE-01
 *
 * Injects correlationId and logs structured execution metrics.
 * Sanitizes URLs and HTTP methods to prevent CR/LF log injection.
 * Does NOT log request bodies, credentials, tokens, or personal info.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Response } from 'express';
import { RequestWithCorrelation } from '../middleware/correlation.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelation>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      request.correlationId ||
      (request.headers['x-correlation-id'] as string) ||
      (response.getHeader('X-Correlation-Id') as string) ||
      'unknown';

    const method = (request.method || 'GET').replace(/[\r\n]/g, '');
    const url = (request.originalUrl || request.url || '').replace(
      /[\r\n]/g,
      '',
    );
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = Date.now() - now;
        this.logger.log(
          `[${correlationId}] ${method} ${url} ${statusCode} +${duration}ms`,
        );
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - now;
        const statusCode = err instanceof HttpException ? err.getStatus() : 500;
        this.logger.warn(
          `[${correlationId}] ${method} ${url} ${statusCode} +${duration}ms [FAILED]`,
        );
        return throwError(() => err);
      }),
    );
  }
}
