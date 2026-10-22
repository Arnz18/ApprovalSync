/**
 * ApprovalSync — Migration: Initial Core Persistence Schema
 * Milestone: BE-02
 *
 * Provisions PostgreSQL 16 relational tables, custom enum types, foreign keys,
 * GIN index on applications.payload_jsonb, and mutation-defense trigger on audit_logs.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCoreSchema1729640000000 implements MigrationInterface {
  name = 'InitialCoreSchema1729640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Custom Enum Types
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
          CREATE TYPE "user_role_enum" AS ENUM (
            'INSTITUTION_USER',
            'SCRUTINY_OFFICER',
            'REGIONAL_OFFICER',
            'EVC_INSPECTOR',
            'SHC_SAC_MEMBER',
            'BUREAU_HEAD',
            'SYSTEM_ADMIN',
            'AUDITOR'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status_enum') THEN
          CREATE TYPE "application_status_enum" AS ENUM (
            'DRAFT',
            'SUBMITTED',
            'UNDER_SCRUTINY',
            'DEFICIENCY_ISSUED',
            'RESUBMITTED',
            'RECOMMENDED_FOR_EVC',
            'EVC_IN_PROGRESS',
            'RECOMMENDED_FOR_SHC',
            'APPROVED',
            'REJECTED',
            'WITHDRAWN'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_processing_status_enum') THEN
          CREATE TYPE "document_processing_status_enum" AS ENUM (
            'UPLOADED',
            'PROCESSING_OCR',
            'OCR_EXTRACTED',
            'FAILED_OCR',
            'MANUAL_REVIEW_REQUIRED'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sla_tier_enum') THEN
          CREATE TYPE "sla_tier_enum" AS ENUM (
            'TIER_1_RO_ALERT',
            'TIER_2_DIRECTOR_BREACH',
            'TIER_3_COUNCIL_LOCK'
          );
        END IF;
      END $$;
    `);

    // 2. Institutions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institutions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "registration_number" varchar(100) NOT NULL,
        "institution_type" varchar(100) NOT NULL,
        "state" varchar(100) NOT NULL,
        "district" varchar(100) NOT NULL,
        "pincode" varchar(10) NOT NULL,
        "address" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_institutions_reg_no" UNIQUE ("registration_number")
      );
    `);

    // 3. Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "institution_id" uuid NULL,
        "regional_office" varchar(100) NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "fk_users_institution" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_users_institution_id" ON "users" ("institution_id");
    `);

    // 4. Applications Table with GIN Index
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_number" varchar(100) NOT NULL,
        "institution_id" uuid NOT NULL,
        "academic_year" varchar(20) NOT NULL,
        "status" "application_status_enum" NOT NULL DEFAULT 'DRAFT',
        "program_type" varchar(100) NOT NULL,
        "payload_jsonb" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "submitted_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_applications_app_number" UNIQUE ("application_number"),
        CONSTRAINT "fk_applications_institution" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS "idx_applications_institution_id" ON "applications" ("institution_id");
      CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "applications" ("status");
      CREATE INDEX IF NOT EXISTS "idx_applications_payload_jsonb" ON "applications" USING gin ("payload_jsonb");
    `);

    // 5. Documents Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "document_type" varchar(100) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "storage_path" varchar(500) NOT NULL,
        "file_hash_sha256" varchar(64) NOT NULL,
        "processing_status" "document_processing_status_enum" NOT NULL DEFAULT 'UPLOADED',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_documents_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "idx_documents_application_id" ON "documents" ("application_id");
      CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents" ("document_type");
    `);

    // 6. Audit Logs Table (Tamper-Evident Append-Only Ledger)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "sequence_number" bigserial PRIMARY KEY,
        "application_id" uuid NOT NULL,
        "actor_id" varchar(100) NOT NULL,
        "actor_role" "user_role_enum" NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "payload_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "previous_hash" varchar(64) NOT NULL,
        "leaf_hash" varchar(64) NOT NULL,
        "current_hash" varchar(64) NOT NULL,
        "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_audit_logs_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_app_seq" ON "audit_logs" ("application_id", "sequence_number");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_current_hash" ON "audit_logs" ("current_hash");
    `);

    // 7. Audit Log Mutation Defense Trigger (ADR-001 / Threat Model Tier 1 Defense)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted.';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_audit_logs_no_mutation ON "audit_logs";
      CREATE TRIGGER trg_audit_logs_no_mutation
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
    `);

    // 8. SLA Timers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sla_timers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "stage" "application_status_enum" NOT NULL,
        "tier" "sla_tier_enum" NOT NULL,
        "target_deadline" timestamptz NOT NULL,
        "is_breached" boolean NOT NULL DEFAULT false,
        "escalated_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_sla_timers_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "idx_sla_timers_app_id" ON "sla_timers" ("application_id");
      CREATE INDEX IF NOT EXISTS "idx_sla_timers_is_breached" ON "sla_timers" ("is_breached");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger & mutation function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_audit_logs_no_mutation ON "audit_logs";
      DROP FUNCTION IF EXISTS prevent_audit_log_mutation();
    `);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "sla_timers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "applications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institutions" CASCADE;`);

    // Drop custom enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "sla_tier_enum";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "document_processing_status_enum";`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "application_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum";`);
  }
}
