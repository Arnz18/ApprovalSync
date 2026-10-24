/**
 * ApprovalSync — Migration: Create Rules and Checklists Schema
 * Milestone: BE-05
 *
 * Provisions PostgreSQL 16 relational tables, custom enum types, foreign keys,
 * unique constraints, and indexes for versioned regulatory rules and checklist templates.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRulesAndChecklists1729720000000 implements MigrationInterface {
  name = 'CreateRulesAndChecklists1729720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Custom Enum Types
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_lifecycle_status_enum') THEN
          CREATE TYPE "rule_lifecycle_status_enum" AS ENUM (
            'DRAFT',
            'PUBLISHED',
            'RETIRED'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_source_classification_enum') THEN
          CREATE TYPE "rule_source_classification_enum" AS ENUM (
            'VERIFIED_REGULATORY',
            'UNVERIFIED_HUMAN_REVIEW_REQUIRED',
            'ILLUSTRATIVE_DEMO'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_type_enum') THEN
          CREATE TYPE "rule_type_enum" AS ENUM (
            'INFRASTRUCTURE_LAND',
            'INFRASTRUCTURE_BUILTUP',
            'FACULTY_RATIO',
            'BARRIER_FREE_ENVIRONMENT',
            'DOCUMENT_MANDATORY',
            'FINANCIAL_DEPOSIT'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_item_type_enum') THEN
          CREATE TYPE "checklist_item_type_enum" AS ENUM (
            'DOCUMENT_UPLOAD',
            'INFRASTRUCTURE_METRIC',
            'AFFIDAVIT_UNDERTAKING',
            'FEE_PAYMENT'
          );
        END IF;
      END $$;
    `);

    // 2. Rule Sets Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rule_sets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "application_category" varchar(100) NOT NULL,
        "issuing_authority" varchar(255) NOT NULL DEFAULT 'AICTE',
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_rule_sets_code" UNIQUE ("code")
      );

      CREATE INDEX IF NOT EXISTS "idx_rule_sets_code" ON "rule_sets" ("code");
      CREATE INDEX IF NOT EXISTS "idx_rule_sets_application_category" ON "rule_sets" ("application_category");
    `);

    // 3. Rule Versions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rule_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "rule_set_id" uuid NOT NULL,
        "version_number" int NOT NULL,
        "status" "rule_lifecycle_status_enum" NOT NULL DEFAULT 'DRAFT',
        "effective_from" timestamptz NOT NULL,
        "effective_to" timestamptz NULL,
        "source_title" varchar(255) NOT NULL,
        "source_reference" varchar(255) NOT NULL,
        "source_classification" "rule_source_classification_enum" NOT NULL DEFAULT 'UNVERIFIED_HUMAN_REVIEW_REQUIRED',
        "change_summary" text NULL,
        "published_at" timestamptz NULL,
        "published_by" uuid NULL,
        "retired_at" timestamptz NULL,
        "retired_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_rule_versions_ruleset_version" UNIQUE ("rule_set_id", "version_number"),
        CONSTRAINT "fk_rule_versions_rule_set" FOREIGN KEY ("rule_set_id") REFERENCES "rule_sets"("id") ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS "idx_rule_versions_rule_set_id" ON "rule_versions" ("rule_set_id");
      CREATE INDEX IF NOT EXISTS "idx_rule_versions_status" ON "rule_versions" ("status");
      CREATE INDEX IF NOT EXISTS "idx_rule_versions_effective_dates" ON "rule_versions" ("effective_from", "effective_to");
      CREATE INDEX IF NOT EXISTS "idx_rule_versions_classification" ON "rule_versions" ("source_classification");
    `);

    // 4. Regulatory Rules Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "regulatory_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "rule_version_id" uuid NOT NULL,
        "rule_code" varchar(100) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "rule_type" "rule_type_enum" NOT NULL,
        "severity" varchar(50) NOT NULL DEFAULT 'CRITICAL_DEFICIENCY',
        "parameters_jsonb" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "source_clause" varchar(255) NULL,
        "source_classification" "rule_source_classification_enum" NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_regulatory_rules_version_code" UNIQUE ("rule_version_id", "rule_code"),
        CONSTRAINT "fk_regulatory_rules_rule_version" FOREIGN KEY ("rule_version_id") REFERENCES "rule_versions"("id") ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS "idx_regulatory_rules_version_id" ON "regulatory_rules" ("rule_version_id");
      CREATE INDEX IF NOT EXISTS "idx_regulatory_rules_type" ON "regulatory_rules" ("rule_type");
    `);

    // 5. Checklist Templates Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checklist_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "rule_version_id" uuid NOT NULL,
        "code" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "application_category" varchar(100) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_checklist_templates_version_code" UNIQUE ("rule_version_id", "code"),
        CONSTRAINT "fk_checklist_templates_rule_version" FOREIGN KEY ("rule_version_id") REFERENCES "rule_versions"("id") ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS "idx_checklist_templates_version_id" ON "checklist_templates" ("rule_version_id");
      CREATE INDEX IF NOT EXISTS "idx_checklist_templates_category" ON "checklist_templates" ("application_category");
    `);

    // 6. Checklist Items Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checklist_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "checklist_template_id" uuid NOT NULL,
        "item_code" varchar(100) NOT NULL,
        "description" text NOT NULL,
        "item_type" "checklist_item_type_enum" NOT NULL,
        "required" boolean NOT NULL DEFAULT true,
        "evidence_document_type" varchar(100) NULL,
        "display_order" int NOT NULL DEFAULT 0,
        "rule_id" uuid NULL,
        "guidance_notes" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_checklist_items_template_code" UNIQUE ("checklist_template_id", "item_code"),
        CONSTRAINT "fk_checklist_items_checklist_template" FOREIGN KEY ("checklist_template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_checklist_items_regulatory_rule" FOREIGN KEY ("rule_id") REFERENCES "regulatory_rules"("id") ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS "idx_checklist_items_template_id" ON "checklist_items" ("checklist_template_id");
      CREATE INDEX IF NOT EXISTS "idx_checklist_items_type" ON "checklist_items" ("item_type");
      CREATE INDEX IF NOT EXISTS "idx_checklist_items_display_order" ON "checklist_items" ("checklist_template_id", "display_order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_templates";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "regulatory_rules";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rule_versions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rule_sets";`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "checklist_item_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rule_type_enum";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "rule_source_classification_enum";`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "rule_lifecycle_status_enum";`,
    );
  }
}
