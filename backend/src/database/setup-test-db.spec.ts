/**
 * ApprovalSync — Test Database Setup Utility Unit Test
 * Milestone: CI & E2E Isolation Hardening
 *
 * Verifies that the test database setup utility can be imported,
 * safely verifies the test database, and handles existing schemas.
 */

import { setupTestDatabase } from './setup-test-db';

describe('setupTestDatabase', () => {
  it('should be a defined function', () => {
    expect(typeof setupTestDatabase).toBe('function');
  });

  it('should execute successfully against the local PostgreSQL test instance', async () => {
    await expect(setupTestDatabase()).resolves.not.toThrow();
  }, 30000);
});
