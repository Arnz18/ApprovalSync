/**
 * ApprovalSync — Seed Runner
 * Milestone: BE-02
 *
 * Command-line runner for database seeding.
 */

import AppDataSource from '../data-source';
import { SeedService } from './seed.service';

async function runSeed(): Promise<void> {
  console.log('[SeedRunner] Initializing database connection...');
  try {
    await AppDataSource.initialize();
    console.log('[SeedRunner] Database connected. Seeding synthetic data...');
    const report = await SeedService.run(AppDataSource);
    console.log('[SeedRunner] Seed execution completed successfully:');
    console.log(
      `  - Institutions created:        ${report.institutionsCreated}`,
    );
    console.log(`  - Users created:               ${report.usersCreated}`);
    console.log(
      `  - Applications created:        ${report.applicationsCreated}`,
    );
    console.log(`  - Documents created:           ${report.documentsCreated}`);
    console.log(`  - Audit logs created:          ${report.auditLogsCreated}`);
    console.log(`  - SLA timers created:          ${report.slaTimersCreated}`);
    console.log(`  - Rule sets created:           ${report.ruleSetsCreated}`);
    console.log(
      `  - Rule versions created:       ${report.ruleVersionsCreated}`,
    );
    console.log(
      `  - Regulatory rules created:    ${report.regulatoryRulesCreated}`,
    );
    console.log(
      `  - Checklist templates created: ${report.checklistTemplatesCreated}`,
    );
    console.log(
      `  - Checklist items created:     ${report.checklistItemsCreated}`,
    );
    console.log(
      `  - Timeline events created:     ${report.timelineEventsCreated}`,
    );
    console.log(
      `  - Undertakings created:        ${report.undertakingsCreated}`,
    );
    console.log(`  - Existing skipped:            ${report.skippedExisting}`);
  } catch (error: unknown) {
    console.error('[SeedRunner] Seeding failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('[SeedRunner] Database connection closed.');
    }
  }
}

void runSeed();
