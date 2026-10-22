/**
 * ApprovalSync — Standard Response Transform Interceptor
 * Formats successful responses to the shared ApiResponse<T> envelope.
 * Milestone: FND-02
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse, PaginationMeta } from '../../shared/contracts';

interface RawResponseWithPagination {
  items: unknown[];
  pagination: PaginationMeta;
}

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelation>();
    const correlationId =
      request.correlationId ||
      (request.headers['x-correlation-id'] as string) ||
      'unknown';

    return next.handle().pipe(
      map((data) => {
        // If data is already in standard ApiResponse envelope, pass through
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          data.success === true &&
          'meta' in data
        ) {
          return data;
        }

        // Handle paginated collection response
        let responseData = data;
        let pagination: PaginationMeta | undefined = undefined;

        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'pagination' in data
        ) {
          const paginated = data as RawResponseWithPagination;
          responseData = paginated.items as T;
          pagination = paginated.pagination;
        }

        const envelope: ApiResponse<T> = {
          success: true,
          data: responseData,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId,
            ...(pagination ? { pagination } : {}),
          },
        };

        return envelope;
      }),
    );
  }
}
