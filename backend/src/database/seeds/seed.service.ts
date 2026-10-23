/**
 * ApprovalSync — Seed Service
 * Milestone: BE-02
 *
 * Provides idempotent insertion of synthetic development data.
 * Safe to execute repeatedly without generating duplicate records or failing on unique constraints.
 */

import { DataSource } from 'typeorm';
import {
  Institution,
  User,
  Application,
  Document,
  AuditLog,
  SlaTimer,
} from '../entities';
import {
  SEED_INSTITUTIONS,
  SEED_USERS,
  SEED_APPLICATIONS,
  SEED_DOCUMENTS,
  SEED_AUDIT_LOGS,
  SEED_SLA_TIMERS,
} from './seed.data';

export interface SeedReport {
  institutionsCreated: number;
  usersCreated: number;
  applicationsCreated: number;
  documentsCreated: number;
  auditLogsCreated: number;
  slaTimersCreated: number;
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

    return report;
  }
}
