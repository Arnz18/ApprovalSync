/**
 * ApprovalSync — TypeORM DataSource Configuration
 * Milestone: BE-02
 *
 * Configures connection pool, entities, and migrations for PostgreSQL 16.
 */

import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
  Institution,
  User,
  Application,
  Document,
  AuditLog,
  SlaTimer,
  RuleSet,
  RuleVersion,
  RegulatoryRule,
  ChecklistTemplate,
  ChecklistItem,
} from './entities';
import { InitialCoreSchema1729640000000 } from './migrations/1729640000000-InitialCoreSchema';
import { CreateRulesAndChecklists1729720000000 } from './migrations/1729720000000-CreateRulesAndChecklists';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password:
    process.env.DB_PASSWORD ||
    (process.env.NODE_ENV === 'production'
      ? undefined
      : 'postgres_dev_password'),
  database: process.env.DB_NAME || 'approvalsync',
  entities: [
    Institution,
    User,
    Application,
    Document,
    AuditLog,
    SlaTimer,
    RuleSet,
    RuleVersion,
    RegulatoryRule,
    ChecklistTemplate,
    ChecklistItem,
  ],
  migrations: [
    InitialCoreSchema1729640000000,
    CreateRulesAndChecklists1729720000000,
  ],

  synchronize: false,
  logging: process.env.DEBUG_LOGGING === 'true',
  extra: {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
