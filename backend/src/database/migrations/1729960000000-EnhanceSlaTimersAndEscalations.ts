/**
 * ApprovalSync — Migration: Enhance SLA Timers and Provision SLA Escalations
 * Milestone: BE-08
 *
 * Adds lifecycle tracking, pause/resume duration, warning thresholds, and last evaluation
 * timestamps to `sla_timers`. Provisions `sla_escalations` table with unique idempotency
 * constraint preventing duplicate warning/breach escalation emissions under concurrent
 * workers or retried job deliveries.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceSlaTimersAndEscalations1729960000000 implements MigrationInterface {
  name = 'EnhanceSlaTimersAndEscalations1729960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add enhanced lifecycle and tracking columns to sla_timers
    await queryRunner.query(`
      ALTER TABLE "sla_timers"
        ADD COLUMN IF NOT EXISTS "status" varchar(32) NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS "policy_id" varchar(64) NOT NULL DEFAULT 'ILLUSTRATIVE_SCRUTINY_POLICY',
        ADD COLUMN IF NOT EXISTS "started_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "warning_deadline" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "is_warning_sent" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "paused_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "resumed_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "total_paused_ms" bigint NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "pause_reason" text NULL,
        ADD COLUMN IF NOT EXISTS "paused_by_id" uuid NULL,
        ADD COLUMN IF NOT EXISTS "completed_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "last_evaluated_at" timestamptz NULL;
    `);

    // 2. Indexes for high-performance due-timer queries and status lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sla_timers_status_deadline"
        ON "sla_timers" ("status", "target_deadline");

      CREATE INDEX IF NOT EXISTS "idx_sla_timers_app_status"
        ON "sla_timers" ("application_id", "status");

      CREATE INDEX IF NOT EXISTS "idx_sla_timers_status"
        ON "sla_timers" ("status");
    `);

    // 3. Create sla_escalations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sla_escalations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "timer_id" uuid NOT NULL,
        "application_id" uuid NOT NULL,
        "stage" "application_status_enum" NOT NULL,
        "tier" "sla_tier_enum" NOT NULL,
        "escalation_level" varchar(32) NOT NULL,
        "idempotency_key" varchar(191) NOT NULL,
        "target_role" "user_role_enum" NOT NULL,
        "policy_id" varchar(64) NOT NULL,
        "policy_version" varchar(32) NOT NULL DEFAULT '1.0.0',
        "target_deadline" timestamptz NOT NULL,
        "detected_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "recipient_details_jsonb" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_dispatched" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_sla_escalations_timer"
          FOREIGN KEY ("timer_id") REFERENCES "sla_timers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sla_escalations_application"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT
      );
    `);

    // 4. Create compound unique index for idempotency enforcement
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sla_escalations_idempotency_key"
        ON "sla_escalations" ("idempotency_key");

      CREATE INDEX IF NOT EXISTS "idx_sla_escalations_app_id"
        ON "sla_escalations" ("application_id");

      CREATE INDEX IF NOT EXISTS "idx_sla_escalations_timer_id"
        ON "sla_escalations" ("timer_id");

      CREATE INDEX IF NOT EXISTS "idx_sla_escalations_created_at"
        ON "sla_escalations" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop sla_escalations table
    await queryRunner.query(`DROP TABLE IF EXISTS "sla_escalations" CASCADE;`);

    // 2. Drop indexes on sla_timers
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_sla_timers_status";
      DROP INDEX IF EXISTS "idx_sla_timers_app_status";
      DROP INDEX IF EXISTS "idx_sla_timers_status_deadline";
    `);

    // 3. Drop columns from sla_timers
    await queryRunner.query(`
      ALTER TABLE "sla_timers"
        DROP COLUMN IF EXISTS "last_evaluated_at",
        DROP COLUMN IF EXISTS "cancelled_at",
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "paused_by_id",
        DROP COLUMN IF EXISTS "pause_reason",
        DROP COLUMN IF EXISTS "total_paused_ms",
        DROP COLUMN IF EXISTS "resumed_at",
        DROP COLUMN IF EXISTS "paused_at",
        DROP COLUMN IF EXISTS "is_warning_sent",
        DROP COLUMN IF EXISTS "warning_deadline",
        DROP COLUMN IF EXISTS "started_at",
        DROP COLUMN IF EXISTS "policy_id",
        DROP COLUMN IF EXISTS "status";
    `);
  }
}
