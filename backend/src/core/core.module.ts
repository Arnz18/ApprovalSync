import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { CorrelationMiddleware } from './middleware/correlation.middleware';

@Global()
@Module({
  providers: [
    HttpExceptionFilter,
    LoggingInterceptor,
    TransformInterceptor,
    CorrelationMiddleware,
  ],
  exports: [
    HttpExceptionFilter,
    LoggingInterceptor,
    TransformInterceptor,
    CorrelationMiddleware,
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
