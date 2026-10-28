/**
 * ApprovalSync — E2E Isolation Guard Unit Test
 * Milestone: Phase 8 & 11 Hardening
 *
 * Verifies that the E2E isolation guard correctly protects 'approvalsync' from
 * mutations and cleanup unless explicitly overridden.
 */

import { assertSafeTestDatabase } from '../../test/e2e-isolation-guard';

describe('assertSafeTestDatabase', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should throw an error when target database is approvalsync and no override is set', () => {
    delete process.env.ALLOW_E2E_ON_DEMO_DB;
    expect(() => assertSafeTestDatabase('approvalsync')).toThrow(
      /E2E ISOLATION GUARD BLOCKED/,
    );
  });

  it('should not throw when target database is approvalsync_test', () => {
    expect(() => assertSafeTestDatabase('approvalsync_test')).not.toThrow();
  });

  it('should permit approvalsync when ALLOW_E2E_ON_DEMO_DB is true', () => {
    process.env.ALLOW_E2E_ON_DEMO_DB = 'true';
    expect(() => assertSafeTestDatabase('approvalsync')).not.toThrow();
  });
});
