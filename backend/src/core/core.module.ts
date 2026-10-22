/**
 * ApprovalSync — Core Module
 * Provides global infrastructure services, filters, and interceptors.
 * Milestone: FND-02
 */

import { Module, Global } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';

@Global()
@Module({
  providers: [HttpExceptionFilter, LoggingInterceptor, TransformInterceptor],
  exports: [HttpExceptionFilter, LoggingInterceptor, TransformInterceptor],
})
export class CoreModule {}
