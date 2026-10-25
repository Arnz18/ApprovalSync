/**
 * ApprovalSync — Infrastructure Evidence Review Assist Tests
 * Milestone: DOC-06
 */

import { InfrastructureReviewAssistService } from './infrastructure-review-assist.service';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
  ApplicationStatus,
} from '../../shared/contracts';

describe('InfrastructureReviewAssistService', () => {
  let service: InfrastructureReviewAssistService;

  const createMockApplication = (
    payloadOverrides: Record<string, any> = {},
  ): Application => {
    return {
      id: 'app-uuid-201',
      applicationNumber: 'APP-2026-INFRA-001',
      institutionId: 'inst-uuid-201',
      academicYear: '2026-2027',
      programType: 'Undergraduate Engineering',
      status: ApplicationStatus.DRAFT,
      payloadJsonb: {
        landAreaAcres: 8.0,
        builtUpAreaSqMeters: 5000,
        barrierFreeFacilities: true,
        ...payloadOverrides,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Application;
  };

  beforeEach(() => {
    service = new InfrastructureReviewAssistService();
  });

  it('detects land area discrepancy when deed extracted acres deviates > 10% from declared acres', () => {
    const app = createMockApplication({ landAreaAcres: 10.0 });
    const documents: Document[] = [
      {
        id: 'doc-land-1',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'title_deed.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              landAreaAcres: 6.0, // 40% deviation
              deedNumber: 'REG-2024-9988',
            },
          },
        },
      } as unknown as Document,
    ];

    const result = service.reviewInfrastructureEvidence(app, documents);

    const landDiscrepancy = result.findings.find(
      (f) => f.findingCode === 'DISCREPANCY_LAND_AREA_MISMATCH',
    );
    expect(landDiscrepancy).toBeDefined();
    expect(landDiscrepancy?.severity).toBe(
      ComplianceSeverity.CRITICAL_DEFICIENCY,
    );
    expect(landDiscrepancy?.requiresPhysicalInspection).toBe(true);
    expect(result.summary.landCompliant).toBe(false);
    expect(result.summary.evcInspectionRecommended).toBe(true);
  });

  it('detects structural anomaly when carpet area exceeds total sanctioned built-up area', () => {
    const app = createMockApplication();
    const documents: Document[] = [
      {
        id: 'doc-plan-1',
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'sanction_drawing.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              totalBuiltUpAreaSqm: 4000,
              carpetAreaSqm: 5500, // Anomaly: carpet > built-up
              approvalNumber: 'PMC-BP-2024-11',
            },
          },
        },
      } as unknown as Document,
    ];

    const result = service.reviewInfrastructureEvidence(app, documents);

    const anomaly = result.findings.find(
      (f) => f.findingCode === 'ANOMALY_CARPET_EXCEEDS_BUILTUP',
    );
    expect(anomaly).toBeDefined();
    expect(anomaly?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    expect(result.summary.builtUpAreaCompliant).toBe(false);
  });

  it('detects built-up area discrepancy when sanctioned area deviates > 15% from intake declaration', () => {
    const app = createMockApplication({ builtUpAreaSqMeters: 6000 });
    const documents: Document[] = [
      {
        id: 'doc-plan-1',
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'sanction_drawing.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              totalBuiltUpAreaSqm: 4200, // 30% deviation
              carpetAreaSqm: 3800,
            },
          },
        },
      } as unknown as Document,
    ];

    const result = service.reviewInfrastructureEvidence(app, documents);

    const discrepancy = result.findings.find(
      (f) => f.findingCode === 'DISCREPANCY_BUILTUP_MISMATCH',
    );
    expect(discrepancy).toBeDefined();
    expect(discrepancy?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
  });

  it('flags missing CLU certificate and generates advisory recommendation', () => {
    const app = createMockApplication();
    const documents: Document[] = []; // No CLU document attached

    const result = service.reviewInfrastructureEvidence(app, documents);

    const cluFinding = result.findings.find(
      (f) => f.findingCode === 'FLAG_CLU_MISSING',
    );
    expect(cluFinding).toBeDefined();
    expect(cluFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    expect(cluFinding?.requiresPhysicalInspection).toBe(true);
  });

  it('flags missing barrier-free accessibility certification and triggers EVC flag', () => {
    const app = createMockApplication({ barrierFreeFacilities: false });
    const documents: Document[] = [];

    const result = service.reviewInfrastructureEvidence(app, documents);

    const barrierFinding = result.findings.find(
      (f) => f.findingCode === 'FLAG_BARRIER_FREE_MISSING',
    );
    expect(barrierFinding).toBeDefined();
    expect(result.summary.barrierFreeDeclared).toBe(false);
    expect(result.summary.evcInspectionRecommended).toBe(true);
  });

  it('generates FLAG_EVC_INSPECTION_RECOMMENDED finding summarizing all physical triggers', () => {
    const app = createMockApplication({ barrierFreeFacilities: false });
    const documents: Document[] = [];

    const result = service.reviewInfrastructureEvidence(app, documents);

    const evcFinding = result.findings.find(
      (f) => f.findingCode === 'FLAG_EVC_INSPECTION_RECOMMENDED',
    );
    expect(evcFinding).toBeDefined();
    expect(evcFinding?.isAdvisory).toBe(true);
    expect(evcFinding?.requiresPhysicalInspection).toBe(true);
    expect(evcFinding?.evidence.length).toBeGreaterThan(0);
    expect(result.summary.heuristicLimitations.length).toBeGreaterThan(0);
  });

  it('ensures all findings strictly declare isAdvisory: true per ADR-004', () => {
    const app = createMockApplication({
      landAreaAcres: 12.0,
      builtUpAreaSqMeters: 3000,
      barrierFreeFacilities: false,
    });
    const documents: Document[] = [];

    const result = service.reviewInfrastructureEvidence(app, documents);

    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.isAdvisory).toBe(true);
    }
  });
});
