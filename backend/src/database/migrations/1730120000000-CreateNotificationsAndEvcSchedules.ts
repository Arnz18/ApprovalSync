/**
 * ApprovalSync — Migration: Provision Notifications, EVC Schedules and Officer Assignments
 * Milestone: AICTE-26262
 *
 * Implements persistent storage for in-app alert notifications, deadline tracking,
 * EVC inspection scheduling with committee expert assignments, and assigned officer tracking.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsAndEvcSchedules1730120000000 implements MigrationInterface {
  name = 'CreateNotificationsAndEvcSchedules1730120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add assigned officer columns to applications table if not already present
    await queryRunner.query(`
      ALTER TABLE "applications"
        ADD COLUMN IF NOT EXISTS "assigned_officer_id" varchar(100) NULL,
        ADD COLUMN IF NOT EXISTS "assigned_officer_name" varchar(150) NULL;
    `);

    // 2. Create evc_schedules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "evc_schedules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "institution_id" uuid NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'SCHEDULED',
        "visit_type" varchar(50) NOT NULL DEFAULT 'PHYSICAL_ON_SITE',
        "proposed_visit_date" timestamptz NOT NULL,
        "scheduled_visit_date" timestamptz NULL,
        "committee_members_jsonb" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "visit_notes" text NULL,
        "outcome_summary" text NULL,
        "recommendation" varchar(50) NOT NULL DEFAULT 'PENDING',
        "scheduled_by" varchar(150) NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_evc_schedules_application" UNIQUE ("application_id"),
        CONSTRAINT "fk_evc_schedules_application"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_evc_schedules_institution"
          FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_evc_schedules_institution_id"
        ON "evc_schedules" ("institution_id");
      CREATE INDEX IF NOT EXISTS "idx_evc_schedules_status"
        ON "evc_schedules" ("status");
    `);

    // 3. Create notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NULL,
        "target_role" varchar(50) NULL,
        "institution_id" uuid NULL,
        "application_id" uuid NULL,
        "undertaking_id" uuid NULL,
        "type" varchar(50) NOT NULL DEFAULT 'GENERAL',
        "severity" varchar(20) NOT NULL DEFAULT 'INFO',
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "link" varchar(255) NULL,
        "is_read" boolean NOT NULL DEFAULT FALSE,
        "read_at" timestamptz NULL,
        "idempotency_key" varchar(255) NULL,
        "metadata_jsonb" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_notifications_idempotency" UNIQUE ("idempotency_key"),
        CONSTRAINT "fk_notifications_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_notifications_institution"
          FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notifications_application"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notifications_undertaking"
          FOREIGN KEY ("undertaking_id") REFERENCES "undertakings"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"
        ON "notifications" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_notifications_target_role"
        ON "notifications" ("target_role");
      CREATE INDEX IF NOT EXISTS "idx_notifications_institution_id"
        ON "notifications" ("institution_id");
      CREATE INDEX IF NOT EXISTS "idx_notifications_is_read"
        ON "notifications" ("is_read");
      CREATE INDEX IF NOT EXISTS "idx_notifications_type"
        ON "notifications" ("type");
      CREATE INDEX IF NOT EXISTS "idx_notifications_created_at"
        ON "notifications" ("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evc_schedules";`);
    await queryRunner.query(`
      ALTER TABLE "applications"
        DROP COLUMN IF EXISTS "assigned_officer_name",
        DROP COLUMN IF EXISTS "assigned_officer_id";
    `);
  }
}
