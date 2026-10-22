/**
 * ApprovalSync — Migration Runner
 * Milestone: BE-02
 *
 * Runs pending TypeORM migrations against the configured PostgreSQL database.
 */

import AppDataSource from './data-source';

async function runMigrations(): Promise<void> {
  console.log('[MigrationRunner] Initializing database connection...');
  try {
    await AppDataSource.initialize();
    console.log(
      '[MigrationRunner] Database connected. Executing pending migrations...',
    );
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length === 0) {
      console.log('[MigrationRunner] No pending migrations to execute.');
    } else {
      console.log(
        `[MigrationRunner] Successfully executed ${migrations.length} migration(s):`,
      );
      migrations.forEach((m) => console.log(`  - ${m.name}`));
    }
  } catch (error: unknown) {
    console.error('[MigrationRunner] Migration execution failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('[MigrationRunner] Database connection closed.');
    }
  }
}

void runMigrations();
