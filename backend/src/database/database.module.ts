/**
 * ApprovalSync — Database Module
 * Milestone: BE-02
 *
 * Configures PostgreSQL TypeORM connection, entities, connection pooling, and lifecycle.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  Institution,
  User,
  Application,
  Document,
  AuditLog,
  SlaTimer,
} from './entities';

export const coreEntities = [
  Institution,
  User,
  Application,
  Document,
  AuditLog,
  SlaTimer,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host', '127.0.0.1'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>('database.user', 'postgres'),
        password: configService.get<string>('database.password', 'postgres'),
        database: configService.get<string>('database.name', 'approvalsync'),
        entities: coreEntities,
        synchronize: false, // Migrations are used exclusively
        logging: configService.get<string>('app.logLevel') === 'debug',
        extra: {
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
    TypeOrmModule.forFeature(coreEntities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
