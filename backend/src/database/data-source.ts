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
  WorkflowTimelineEvent,
  AuditCheckpoint,
  SlaEscalation,
  Undertaking,
  UndertakingHistory,
} from './entities';
import { InitialCoreSchema1729640000000 } from './migrations/1729640000000-InitialCoreSchema';
import { CreateRulesAndChecklists1729720000000 } from './migrations/1729720000000-CreateRulesAndChecklists';
import { CreateWorkflowTimelineEvents1729800000000 } from './migrations/1729800000000-CreateWorkflowTimelineEvents';
import { CreateAuditCheckpoints1729880000000 } from './migrations/1729880000000-CreateAuditCheckpoints';
import { EnhanceSlaTimersAndEscalations1729960000000 } from './migrations/1729960000000-EnhanceSlaTimersAndEscalations';
import { CreateUndertakingsAndLeases1730040000000 } from './migrations/1730040000000-CreateUndertakingsAndLeases';

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
    WorkflowTimelineEvent,
    AuditCheckpoint,
    SlaEscalation,
    Undertaking,
    UndertakingHistory,
  ],
  migrations: [
    InitialCoreSchema1729640000000,
    CreateRulesAndChecklists1729720000000,
    CreateWorkflowTimelineEvents1729800000000,
    CreateAuditCheckpoints1729880000000,
    EnhanceSlaTimersAndEscalations1729960000000,
    CreateUndertakingsAndLeases1730040000000,
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
