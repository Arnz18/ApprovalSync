/**
 * ApprovalSync — Migration: Provision Undertakings, Leases and History Ledger
 * Milestone: BE-09
 *
 * Provisions relational schema for institutional undertakings, registered lease deeds,
 * validity periods, deterministic renewal lead dates, supersession links, and
 * immutable history logs.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUndertakingsAndLeases1730040000000 implements MigrationInterface {
  name = 'CreateUndertakingsAndLeases1730040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create undertakings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "undertakings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "institution_id" uuid NOT NULL,
        "application_id" uuid NULL,
        "type" varchar(64) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'DRAFT',
        "review_status" varchar(32) NOT NULL DEFAULT 'PENDING_REVIEW',
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "document_number" varchar(128) NULL,
        "issuing_authority" varchar(255) NULL,
        "counterparty_name" varchar(255) NULL,
        "start_date" date NOT NULL,
        "expiry_date" date NOT NULL,
        "renewal_due_date" date NOT NULL,
        "renewal_lead_days" integer NOT NULL DEFAULT 60,
        "document_id" uuid NULL,
        "superseded_by_id" uuid NULL,
        "supersedes_id" uuid NULL,
        "reviewed_by_id" uuid NULL,
        "reviewed_at" timestamptz NULL,
        "review_notes" text NULL,
        "metadata_jsonb" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_by_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_undertakings_institution"
          FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_undertakings_application"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_undertakings_document"
          FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_undertakings_superseded_by"
          FOREIGN KEY ("superseded_by_id") REFERENCES "undertakings"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_undertakings_supersedes"
          FOREIGN KEY ("supersedes_id") REFERENCES "undertakings"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_undertakings_reviewed_by"
          FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_undertakings_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // 2. Indexes for undertakings queries and filters
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_undertakings_institution_id"
        ON "undertakings" ("institution_id");

      CREATE INDEX IF NOT EXISTS "idx_undertakings_application_id"
        ON "undertakings" ("application_id");

      CREATE INDEX IF NOT EXISTS "idx_undertakings_type"
        ON "undertakings" ("type");

      CREATE INDEX IF NOT EXISTS "idx_undertakings_status"
        ON "undertakings" ("status");

      CREATE INDEX IF NOT EXISTS "idx_undertakings_expiry_date"
        ON "undertakings" ("expiry_date");

      CREATE INDEX IF NOT EXISTS "idx_undertakings_renewal_due_date"
        ON "undertakings" ("renewal_due_date");

      CREATE INDEX IF NOT EXISTS "idx_undertakings_status_expiry"
        ON "undertakings" ("status", "expiry_date");
    `);

    // 3. Create undertaking_history table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "undertaking_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "undertaking_id" uuid NOT NULL,
        "action" varchar(64) NOT NULL,
        "from_status" varchar(32) NULL,
        "to_status" varchar(32) NOT NULL,
        "from_review_status" varchar(32) NULL,
        "to_review_status" varchar(32) NULL,
        "actor_id" varchar(100) NOT NULL,
        "actor_role" "user_role_enum" NOT NULL,
        "actor_email" varchar(255) NULL,
        "change_reason" text NULL,
        "snapshot_jsonb" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_undertaking_history_undertaking"
          FOREIGN KEY ("undertaking_id") REFERENCES "undertakings"("id") ON DELETE CASCADE
      );
    `);

    // 4. Indexes for undertaking_history
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_undertaking_history_undertaking_id"
        ON "undertaking_history" ("undertaking_id");

      CREATE INDEX IF NOT EXISTS "idx_undertaking_history_created_at"
        ON "undertaking_history" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "undertaking_history" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "undertakings" CASCADE;`);
  }
}
