/**
 * ApprovalSync — Seed Service
 * Milestone: BE-02
 *
 * Provides idempotent insertion of synthetic development data.
 * Safe to execute repeatedly without generating duplicate records or failing on unique constraints.
 */

import { DataSource } from 'typeorm';
import { ApplicationStatus, UserRole } from '../../shared/contracts';
import {
  Institution,
  User,
  Application,
  Document,
  AuditLog,
  SlaTimer,
  RuleSet,
  RuleVersion,
  RegulatoryRule,
  ChecklistTemplate,
  ChecklistItem,
  WorkflowTimelineEvent,
} from '../entities';
import {
  SEED_INSTITUTIONS,
  SEED_USERS,
  SEED_APPLICATIONS,
  SEED_DOCUMENTS,
  SEED_AUDIT_LOGS,
  SEED_SLA_TIMERS,
  SEED_RULE_SETS,
  SEED_RULE_VERSIONS,
  SEED_REGULATORY_RULES,
  SEED_CHECKLIST_TEMPLATES,
  SEED_CHECKLIST_ITEMS,
} from './seed.data';

export interface SeedReport {
  institutionsCreated: number;
  usersCreated: number;
  applicationsCreated: number;
  documentsCreated: number;
  auditLogsCreated: number;
  slaTimersCreated: number;
  ruleSetsCreated: number;
  ruleVersionsCreated: number;
  regulatoryRulesCreated: number;
  checklistTemplatesCreated: number;
  checklistItemsCreated: number;
  timelineEventsCreated: number;
  skippedExisting: number;
}

export class SeedService {
  public static async run(dataSource: DataSource): Promise<SeedReport> {
    const report: SeedReport = {
      institutionsCreated: 0,
      usersCreated: 0,
      applicationsCreated: 0,
      documentsCreated: 0,
      auditLogsCreated: 0,
      slaTimersCreated: 0,
      ruleSetsCreated: 0,
      ruleVersionsCreated: 0,
      regulatoryRulesCreated: 0,
      checklistTemplatesCreated: 0,
      checklistItemsCreated: 0,
      timelineEventsCreated: 0,
      skippedExisting: 0,
    };

    const institutionRepo = dataSource.getRepository(Institution);
    const userRepo = dataSource.getRepository(User);
    const applicationRepo = dataSource.getRepository(Application);
    const documentRepo = dataSource.getRepository(Document);
    const auditLogRepo = dataSource.getRepository(AuditLog);
    const slaTimerRepo = dataSource.getRepository(SlaTimer);

    // 1. Seed Institutions
    const institutionMap = new Map<string, Institution>();
    for (const data of SEED_INSTITUTIONS) {
      let inst = await institutionRepo.findOne({
        where: { registrationNumber: data.registrationNumber },
      });
      if (!inst) {
        inst = institutionRepo.create(data);
        await institutionRepo.save(inst);
        report.institutionsCreated++;
      } else {
        report.skippedExisting++;
      }
      institutionMap.set(data.registrationNumber, inst);
    }

    // 2. Seed Users
    for (const data of SEED_USERS) {
      const existingUser = await userRepo.findOne({
        where: { email: data.email },
      });
      if (!existingUser) {
        const user = userRepo.create({
          name: data.name,
          email: data.email,
          role: data.role,
          passwordHash: data.passwordHash,
          institutionId: data.institutionRegistrationNumber
            ? institutionMap.get(data.institutionRegistrationNumber)?.id
            : undefined,
          regionalOffice: data.regionalOffice,
          isActive: data.isActive !== undefined ? data.isActive : true,
        });
        await userRepo.save(user);
        report.usersCreated++;
      } else {
        await userRepo.update(existingUser.id, {
          passwordHash: data.passwordHash,
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        });
        report.skippedExisting++;
      }
    }

    // 3. Seed Applications
    const applicationMap = new Map<string, Application>();
    for (const data of SEED_APPLICATIONS) {
      let app = await applicationRepo.findOne({
        where: { applicationNumber: data.applicationNumber },
      });
      if (!app) {
        const institution = institutionMap.get(
          data.institutionRegistrationNumber,
        );
        if (!institution) {
          throw new Error(
            `Institution ${data.institutionRegistrationNumber} not found for seed application ${data.applicationNumber}`,
          );
        }
        app = applicationRepo.create({
          applicationNumber: data.applicationNumber,
          institutionId: institution.id,
          academicYear: data.academicYear,
          status: data.status,
          programType: data.programType,
          payloadJsonb: data.payloadJsonb,
          submittedAt: data.submittedAt,
        });
        await applicationRepo.save(app);
        report.applicationsCreated++;
      } else {
        report.skippedExisting++;
      }
      applicationMap.set(data.applicationNumber, app);
    }

    // 4. Seed Documents
    for (const data of SEED_DOCUMENTS) {
      const app = applicationMap.get(data.applicationNumber);
      if (!app) continue;

      const existingDoc = await documentRepo.findOne({
        where: { applicationId: app.id, fileName: data.fileName },
      });
      if (!existingDoc) {
        const doc = documentRepo.create({
          applicationId: app.id,
          documentType: data.documentType,
          fileName: data.fileName,
          mimeType: data.mimeType,
          fileSizeBytes: data.fileSizeBytes,
          storagePath: data.storagePath,
          fileHashSha256: data.fileHashSha256,
          processingStatus: data.processingStatus,
          metadata: data.metadata,
        });
        await documentRepo.save(doc);
        report.documentsCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    // 5. Seed Audit Logs
    for (const data of SEED_AUDIT_LOGS) {
      const app = applicationMap.get(data.applicationNumber);
      if (!app) continue;

      const existingLog = await auditLogRepo.findOne({
        where: { applicationId: app.id, eventType: data.eventType },
      });
      if (!existingLog) {
        const log = auditLogRepo.create({
          applicationId: app.id,
          actorId: data.actorId,
          actorRole: data.actorRole,
          eventType: data.eventType,
          payloadSnapshot: data.payloadSnapshot,
          previousHash: data.previousHash,
          leafHash: data.leafHash,
          currentHash: data.currentHash,
        });
        await auditLogRepo.save(log);
        report.auditLogsCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    // 6. Seed SLA Timers
    for (const data of SEED_SLA_TIMERS) {
      const app = applicationMap.get(data.applicationNumber);
      if (!app) continue;

      const existingTimer = await slaTimerRepo.findOne({
        where: {
          applicationId: app.id,
          stage: data.stage,
          tier: data.tier,
        },
      });
      if (!existingTimer) {
        const timer = slaTimerRepo.create({
          applicationId: app.id,
          stage: data.stage,
          tier: data.tier,
          targetDeadline: data.targetDeadline,
          isBreached: data.isBreached,
        });
        await slaTimerRepo.save(timer);
        report.slaTimersCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    // 7. Seed Rule Sets
    const ruleSetRepo = dataSource.getRepository(RuleSet);
    const ruleVersionRepo = dataSource.getRepository(RuleVersion);
    const regulatoryRuleRepo = dataSource.getRepository(RegulatoryRule);
    const checklistTemplateRepo = dataSource.getRepository(ChecklistTemplate);
    const checklistItemRepo = dataSource.getRepository(ChecklistItem);

    const ruleSetMap = new Map<string, RuleSet>();
    for (const data of SEED_RULE_SETS) {
      let rs = await ruleSetRepo.findOne({
        where: { code: data.code },
      });
      if (!rs) {
        rs = ruleSetRepo.create(data);
        await ruleSetRepo.save(rs);
        report.ruleSetsCreated++;
      } else {
        report.skippedExisting++;
      }
      ruleSetMap.set(data.code, rs);
    }

    // 8. Seed Rule Versions
    const ruleVersionMap = new Map<string, RuleVersion>();
    for (const data of SEED_RULE_VERSIONS) {
      const ruleSet = ruleSetMap.get(data.ruleSetCode);
      if (!ruleSet) continue;

      const key = `${data.ruleSetCode}-v${data.versionNumber}`;
      let version = await ruleVersionRepo.findOne({
        where: {
          ruleSetId: ruleSet.id,
          versionNumber: data.versionNumber,
        },
      });
      if (!version) {
        version = ruleVersionRepo.create({
          ruleSetId: ruleSet.id,
          versionNumber: data.versionNumber,
          status: data.status,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          sourceTitle: data.sourceTitle,
          sourceReference: data.sourceReference,
          sourceClassification: data.sourceClassification,
          changeSummary: data.changeSummary || null,
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        });
        await ruleVersionRepo.save(version);
        report.ruleVersionsCreated++;
      } else {
        report.skippedExisting++;
      }
      ruleVersionMap.set(key, version);
    }

    // 9. Seed Regulatory Rules
    const regulatoryRuleMap = new Map<string, RegulatoryRule>();
    for (const data of SEED_REGULATORY_RULES) {
      const versionKey = `${data.ruleSetCode}-v${data.versionNumber}`;
      const version = ruleVersionMap.get(versionKey);
      if (!version) continue;

      let rule = await regulatoryRuleRepo.findOne({
        where: {
          ruleVersionId: version.id,
          ruleCode: data.ruleCode,
        },
      });
      if (!rule) {
        rule = regulatoryRuleRepo.create({
          ruleVersionId: version.id,
          ruleCode: data.ruleCode,
          title: data.title,
          description: data.description,
          ruleType: data.ruleType,
          severity: data.severity,
          parametersJsonb: data.parametersJsonb,
          sourceClause: data.sourceClause || null,
          sourceClassification: data.sourceClassification || null,
        });
        await regulatoryRuleRepo.save(rule);
        report.regulatoryRulesCreated++;
      } else {
        report.skippedExisting++;
      }
      regulatoryRuleMap.set(data.ruleCode, rule);
    }

    // 10. Seed Checklist Templates
    const checklistTemplateMap = new Map<string, ChecklistTemplate>();
    for (const data of SEED_CHECKLIST_TEMPLATES) {
      const versionKey = `${data.ruleSetCode}-v${data.versionNumber}`;
      const version = ruleVersionMap.get(versionKey);
      if (!version) continue;

      let template = await checklistTemplateRepo.findOne({
        where: {
          ruleVersionId: version.id,
          code: data.code,
        },
      });
      if (!template) {
        template = checklistTemplateRepo.create({
          ruleVersionId: version.id,
          code: data.code,
          name: data.name,
          description: data.description || null,
          applicationCategory: data.applicationCategory,
        });
        await checklistTemplateRepo.save(template);
        report.checklistTemplatesCreated++;
      } else {
        report.skippedExisting++;
      }
      checklistTemplateMap.set(data.code, template);
    }

    // 11. Seed Checklist Items
    for (const data of SEED_CHECKLIST_ITEMS) {
      const template = checklistTemplateMap.get(data.templateCode);
      if (!template) continue;

      const existingItem = await checklistItemRepo.findOne({
        where: {
          checklistTemplateId: template.id,
          itemCode: data.itemCode,
        },
      });
      if (!existingItem) {
        const linkedRule = data.ruleCode
          ? regulatoryRuleMap.get(data.ruleCode)
          : undefined;

        const item = checklistItemRepo.create({
          checklistTemplateId: template.id,
          itemCode: data.itemCode,
          description: data.description,
          itemType: data.itemType,
          required: data.required,
          evidenceDocumentType: data.evidenceDocumentType || null,
          displayOrder: data.displayOrder,
          ruleId: linkedRule ? linkedRule.id : null,
          guidanceNotes: data.guidanceNotes || null,
        });
        await checklistItemRepo.save(item);
        report.checklistItemsCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    // 8. Seed Initial Workflow Timeline Events for Submitted Applications
    const timelineRepo = dataSource.getRepository(WorkflowTimelineEvent);
    for (const app of applicationMap.values()) {
      if (app.status === ApplicationStatus.SUBMITTED) {
        const existingEvent = await timelineRepo.findOne({
          where: {
            applicationId: app.id,
            eventType: 'APPLICATION_SUBMITTED',
          },
        });
        if (!existingEvent) {
          const event = timelineRepo.create({
            applicationId: app.id,
            fromStatus: ApplicationStatus.DRAFT,
            toStatus: ApplicationStatus.SUBMITTED,
            eventType: 'APPLICATION_SUBMITTED',
            actorId: 'seed-system',
            actorRole: UserRole.INSTITUTION_USER,
            comment: 'Application submitted during synthetic intake seed',
            createdAt: app.submittedAt || new Date('2026-10-15T00:00:00.000Z'),
          });
          await timelineRepo.save(event);
          report.timelineEventsCreated++;
        } else {
          report.skippedExisting++;
        }
      }
    }

    return report;
  }
}
