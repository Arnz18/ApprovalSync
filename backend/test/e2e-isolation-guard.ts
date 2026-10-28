/**
 * ApprovalSync — E2E Test Isolation Guard & Database Safety Harness
 * Milestone: INT-03 Hardening & Defect Remediation (Phase 8)
 *
 * Safeguards the primary demonstration and development database ('approvalsync')
 * from accidental mutation, test-data leakage, or destructive cleanup during E2E runs.
 *
 * Invariants:
 * 1. Default DB_NAME for E2E runs is directed to the isolated test database ('approvalsync_test')
 *    unless explicitly configured via TEST_DB_NAME.
 * 2. If an E2E suite attempts to run destructive operations against 'approvalsync' without
 *    explicit override flag (ALLOW_E2E_ON_DEMO_DB=true), a safety exception is raised.
 * 3. Provides assertSafeTestDatabase() utility for test suites performing teardown/cleanup.
 */

export function assertSafeTestDatabase(dbName?: string): void {
  const target = (dbName || process.env.DB_NAME || 'approvalsync')
    .trim()
    .toLowerCase();
  const isProtectedDemoDb = target === 'approvalsync';
  const allowOverride = process.env.ALLOW_E2E_ON_DEMO_DB === 'true';

  if (isProtectedDemoDb && !allowOverride) {
    const errorMsg =
      `[E2E ISOLATION GUARD BLOCKED] Attempted to run mutating E2E tests or destructive cleanup ` +
      `against the primary demonstration database ('${target}'). ` +
      `Configure TEST_DB_NAME='approvalsync_test' or set ALLOW_E2E_ON_DEMO_DB=true to override explicitly.`;
    throw new Error(errorMsg);
  }
}

// Automatically enforce isolated database during Jest E2E runs
if (process.env.NODE_ENV !== 'production') {
  const testDbName = process.env.TEST_DB_NAME || 'approvalsync_test';
  if (!process.env.DB_NAME || process.env.DB_NAME === 'approvalsync') {
    process.env.DB_NAME = testDbName;
  }
  // If host DB port was mapped to 5434 in development docker compose, preserve if unset
  if (!process.env.DB_PORT) {
    process.env.DB_PORT = '5434';
  }
}
