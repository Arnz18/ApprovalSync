/**
 * ApprovalSync — Seed Service
 * Milestone: BE-02 / AICTE-26262
 *
 * Provides idempotent insertion of synthetic development data for AICTE Problem Statement 26262.
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
  Undertaking,
  UndertakingHistory,
  EvcSchedule,
  Notification,
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
  SEED_UNDERTAKINGS,
  SEED_EVC_SCHEDULES,
  SEED_NOTIFICATIONS,
} from './seed.data';
import { calculateRenewalDueDate } from '../../undertakings/utils/date-calculations';

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
  undertakingsCreated: number;
  evcSchedulesCreated: number;
  notificationsCreated: number;
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
      undertakingsCreated: 0,
      evcSchedulesCreated: 0,
      notificationsCreated: 0,
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

    // 3. Seed Applications (Scenarios 1-6)
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
          assignedOfficerId: data.assignedOfficerId,
          assignedOfficerName: data.assignedOfficerName,
        });
        await applicationRepo.save(app);
        report.applicationsCreated++;
      } else {
        // Update application data to reflect scenario upgrades
        app.status = data.status;
        app.payloadJsonb = data.payloadJsonb;
        if (data.assignedOfficerName) {
          app.assignedOfficerName = data.assignedOfficerName;
        }
        if (data.assignedOfficerId) {
          app.assignedOfficerId = data.assignedOfficerId;
        }
        await applicationRepo.save(app);
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

    // 12. Seed Initial Workflow Timeline Events for Submitted Applications
    const timelineRepo = dataSource.getRepository(WorkflowTimelineEvent);
    for (const app of applicationMap.values()) {
      if (
        app.status === ApplicationStatus.SUBMITTED ||
        app.status === ApplicationStatus.UNDER_SCRUTINY ||
        app.status === ApplicationStatus.RESUBMITTED ||
        app.status === ApplicationStatus.RECOMMENDED_FOR_EVC
      ) {
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

    // 13. Seed Synthetic Undertakings & Leases
    const undertakingRepo = dataSource.getRepository(Undertaking);
    const historyRepo = dataSource.getRepository(UndertakingHistory);
    for (const seedU of SEED_UNDERTAKINGS) {
      const inst = institutionMap.get(seedU.institutionRegistrationNumber);
      if (!inst) continue;

      const app = seedU.applicationNumber
        ? applicationMap.get(seedU.applicationNumber)
        : null;

      const existing = await undertakingRepo.findOne({
        where: {
          institutionId: inst.id,
          documentNumber: seedU.documentNumber,
        },
      });

      if (!existing) {
        const renewalDue =
          seedU.renewalDueDate ||
          calculateRenewalDueDate(seedU.expiryDate, seedU.renewalLeadDays);

        const undertaking = undertakingRepo.create({
          institutionId: inst.id,
          applicationId: app ? app.id : null,
          type: seedU.type,
          status: seedU.status,
          reviewStatus: seedU.reviewStatus,
          title: seedU.title,
          description: seedU.description || null,
          documentNumber: seedU.documentNumber,
          issuingAuthority: seedU.issuingAuthority,
          counterpartyName: seedU.counterpartyName || null,
          startDate: seedU.startDate,
          expiryDate: seedU.expiryDate,
          renewalLeadDays: seedU.renewalLeadDays,
          renewalDueDate: renewalDue,
          metadataJsonb: seedU.metadataJsonb || {},
        });
        const saved = await undertakingRepo.save(undertaking);

        const history = historyRepo.create({
          undertakingId: saved.id,
          action: 'SEEDED',
          fromStatus: null,
          toStatus: saved.status,
          fromReviewStatus: null,
          toReviewStatus: saved.reviewStatus,
          actorId: 'seed-system',
          actorRole: UserRole.SYSTEM_ADMIN,
          actorEmail: 'system@synthetic.approvalsync.local',
          changeReason: 'Initial synthetic demonstration seed',
          snapshotJsonb: {
            id: saved.id,
            institutionId: saved.institutionId,
            title: saved.title,
            documentNumber: saved.documentNumber,
            startDate: saved.startDate,
            expiryDate: saved.expiryDate,
            renewalDueDate: saved.renewalDueDate,
          },
        });
        await historyRepo.save(history);
        report.undertakingsCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    // 14. Seed EVC Schedules (Scenario 6)
    const evcRepo = dataSource.getRepository(EvcSchedule);
    for (const seedEvc of SEED_EVC_SCHEDULES) {
      const app = applicationMap.get(seedEvc.applicationNumber);
      if (!app) continue;

      const inst = institutionMap.get(seedEvc.institutionRegistrationNumber);
      if (!inst) continue;

      const existingSchedule = await evcRepo.findOne({
        where: { applicationId: app.id },
      });

      if (!existingSchedule) {
        const schedule = evcRepo.create({
          applicationId: app.id,
          institutionId: inst.id,
          status: seedEvc.status,
          visitType: seedEvc.visitType,
          proposedVisitDate: new Date(seedEvc.proposedVisitDate),
          scheduledVisitDate: seedEvc.scheduledVisitDate
            ? new Date(seedEvc.scheduledVisitDate)
            : new Date(seedEvc.proposedVisitDate),
          committeeMembersJsonb: seedEvc.committeeMembers,
          visitNotes: seedEvc.visitNotes || null,
          outcomeSummary: seedEvc.outcomeSummary || null,
          recommendation: seedEvc.recommendation,
          scheduledBy: seedEvc.scheduledBy || null,
        });
        await evcRepo.save(schedule);
        report.evcSchedulesCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    // 15. Seed In-App Notifications
    const notifRepo = dataSource.getRepository(Notification);
    for (const seedNotif of SEED_NOTIFICATIONS) {
      let instId: string | null = null;
      if (seedNotif.institutionRegistrationNumber) {
        instId =
          institutionMap.get(seedNotif.institutionRegistrationNumber)?.id ||
          null;
      }
      let appId: string | null = null;
      if (seedNotif.applicationNumber) {
        appId = applicationMap.get(seedNotif.applicationNumber)?.id || null;
      }

      const existingNotif = await notifRepo.findOne({
        where: { idempotencyKey: seedNotif.idempotencyKey },
      });

      if (!existingNotif) {
        const notif = notifRepo.create({
          targetRole: seedNotif.targetRole || null,
          institutionId: instId,
          applicationId: appId,
          type: seedNotif.type,
          severity: seedNotif.severity,
          title: seedNotif.title,
          message: seedNotif.message,
          link: seedNotif.link || null,
          idempotencyKey: seedNotif.idempotencyKey,
          isRead: seedNotif.isRead || false,
          metadataJsonb: seedNotif.metadata || {},
        });
        await notifRepo.save(notif);
        report.notificationsCreated++;
      } else {
        report.skippedExisting++;
      }
    }

    return report;
  }
}
