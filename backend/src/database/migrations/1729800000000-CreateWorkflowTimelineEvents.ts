/**
 * ApprovalSync — Migration: Create Workflow Timeline Events Table
 * Milestone: BE-06
 *
 * Provisions workflow_timeline_events table for tracking all application state transitions,
 * associated actors, roles, and transition reasons, with foreign-key referential protection.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowTimelineEvents1729800000000 implements MigrationInterface {
  name = 'CreateWorkflowTimelineEvents1729800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_timeline_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL,
        "from_status" "application_status_enum" NOT NULL,
        "to_status" "application_status_enum" NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "actor_id" varchar(100) NOT NULL,
        "actor_role" "user_role_enum" NOT NULL,
        "comment" text NULL,
        "correlation_id" varchar(100) NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_workflow_timeline_events_application"
          FOREIGN KEY ("application_id")
          REFERENCES "applications"("id")
          ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS "idx_workflow_timeline_events_app_id"
        ON "workflow_timeline_events" ("application_id", "created_at" ASC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "workflow_timeline_events";
    `);
  }
}
