/**
 * ApprovalSync — Structured Logging & Correlation Interceptor
 * Injects correlationId and logs structured execution metrics.
 * Milestone: FND-02
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelation>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv4();

    // Attach to request and response
    request.correlationId = correlationId;
    response.setHeader('X-Correlation-Id', correlationId);

    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = Date.now() - now;
        this.logger.log(
          `[${correlationId}] ${method} ${url} ${statusCode} +${duration}ms`,
        );
      }),
    );
  }
}
