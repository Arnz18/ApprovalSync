/**
 * ApprovalSync — Test Database Setup Utility
 * Milestone: CI & E2E Isolation Hardening (Phase 8 & 11)
 *
 * Ensures the isolated test database (e.g. 'approvalsync_test') exists,
 * runs all pending TypeORM migrations, and seeds baseline data.
 * Safe to execute repeatedly in both CI and local environments.
 */

import { Client } from 'pg';
import { DataSource, DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from './data-source';
import { SeedService } from './seeds/seed.service';

export async function setupTestDatabase(): Promise<void> {
  const host = process.env.DB_HOST || '127.0.0.1';
  let port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password =
    process.env.DB_PASSWORD ||
    (process.env.NODE_ENV === 'production'
      ? undefined
      : 'postgres_dev_password');
  const testDbName = process.env.TEST_DB_NAME || 'approvalsync_test';

  // In local environments where docker compose mapped port 5434 -> 5432,
  // probe connection and fallback to 5434 if 5432 is not reachable.
  let connectedClient: Client | null = null;
  const portsToTry = process.env.DB_PORT ? [port] : [port, 5434];

  for (const p of portsToTry) {
    const probeClient = new Client({
      host,
      port: p,
      user,
      password,
      database: 'postgres',
    });
    try {
      await probeClient.connect();
      connectedClient = probeClient;
      port = p;
      process.env.DB_PORT = p.toString();
      break;
    } catch (_err: unknown) {
      await probeClient.end().catch(() => {});
    }
  }

  if (!connectedClient) {
    throw new Error(
      `[TestDbSetup] Could not connect to PostgreSQL on ${host} (attempted ports: ${portsToTry.join(', ')}).`,
    );
  }

  console.log(
    `[TestDbSetup] Connected to PostgreSQL maintenance database on ${host}:${port}. Verifying "${testDbName}"...`,
  );

  try {
    const checkRes = await connectedClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDbName],
    );
    if (checkRes.rowCount === 0) {
      console.log(
        `[TestDbSetup] Database "${testDbName}" does not exist. Creating...`,
      );
      await connectedClient.query(`CREATE DATABASE "${testDbName}"`);
      console.log(
        `[TestDbSetup] Database "${testDbName}" created successfully.`,
      );
    } else {
      console.log(`[TestDbSetup] Database "${testDbName}" already exists.`);
    }
  } finally {
    await connectedClient.end().catch(() => {});
  }

  // Initialize DataSource targeting the test database and run migrations & seed
  const testDataSource = new DataSource({
    ...dataSourceOptions,
    port,
    database: testDbName,
  } as DataSourceOptions);

  try {
    await testDataSource.initialize();
    console.log(
      `[TestDbSetup] Connected to "${testDbName}". Applying pending migrations...`,
    );
    const migrations = await testDataSource.runMigrations();
    console.log(
      `[TestDbSetup] Applied ${migrations.length} migration(s) to "${testDbName}".`,
    );

    console.log(
      `[TestDbSetup] Populating baseline synthetic seed models in "${testDbName}"...`,
    );
    const report = await SeedService.run(testDataSource);
    console.log(
      `[TestDbSetup] Seed completed: ${report.institutionsCreated} institutions, ` +
        `${report.usersCreated} users, ${report.applicationsCreated} applications created ` +
        `(${report.skippedExisting} existing models preserved).`,
    );
  } finally {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy().catch(() => {});
    }
  }

  console.log(
    `[TestDbSetup] Isolated test database "${testDbName}" is verified and ready.`,
  );
}

if (require.main === module) {
  setupTestDatabase().catch((err) => {
    console.error('[TestDbSetup] Failed to initialize test database:', err);
    process.exit(1);
  });
}
