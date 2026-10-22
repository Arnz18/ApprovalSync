/**
 * ApprovalSync — Migration Revert Runner
 * Milestone: BE-02
 *
 * Reverts the most recently executed TypeORM migration.
 */

import AppDataSource from './data-source';

async function revertMigrations(): Promise<void> {
  console.log('[MigrationReverter] Initializing database connection...');
  try {
    await AppDataSource.initialize();
    console.log(
      '[MigrationReverter] Database connected. Reverting last migration...',
    );
    await AppDataSource.undoLastMigration();
    console.log('[MigrationReverter] Successfully reverted last migration.');
  } catch (error: unknown) {
    console.error('[MigrationReverter] Migration revert failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('[MigrationReverter] Database connection closed.');
    }
  }
}

void revertMigrations();
