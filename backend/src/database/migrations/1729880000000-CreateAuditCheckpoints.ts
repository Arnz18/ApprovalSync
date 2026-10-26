/**
 * ApprovalSync — Migration: Create Audit Checkpoints Table & Append-Only Mutation Defense
 * Milestone: BE-07
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditCheckpoints1729880000000 implements MigrationInterface {
  name = 'CreateAuditCheckpoints1729880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_checkpoints" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "sequence_number" bigint NOT NULL,
        "chain_head_hash" varchar(64) NOT NULL,
        "merkle_root_hash" varchar(64) NOT NULL,
        "total_blocks" integer NOT NULL,
        "algorithm" varchar(50) NOT NULL DEFAULT 'RFC6962_SHA256',
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_audit_checkpoints" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_checkpoints_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS "idx_audit_checkpoints_app_created" ON "audit_checkpoints" ("application_id", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_audit_checkpoints_root_hash" ON "audit_checkpoints" ("merkle_root_hash");

      CREATE OR REPLACE FUNCTION prevent_audit_checkpoint_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit checkpoints are immutable and cannot be updated or deleted.';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_audit_checkpoints_no_mutation ON "audit_checkpoints";
      CREATE TRIGGER trg_audit_checkpoints_no_mutation
      BEFORE UPDATE OR DELETE ON "audit_checkpoints"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_checkpoint_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_audit_checkpoints_no_mutation ON "audit_checkpoints";
      DROP FUNCTION IF EXISTS prevent_audit_checkpoint_mutation();
      DROP TABLE IF EXISTS "audit_checkpoints" CASCADE;
    `);
  }
}
