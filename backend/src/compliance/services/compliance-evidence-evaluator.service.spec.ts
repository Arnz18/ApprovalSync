/**
 * ApprovalSync — Compliance Evidence Evaluator Service Tests
 * Milestone: DOC-06
 */

import { ComplianceEvidenceEvaluatorService } from './compliance-evidence-evaluator.service';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
  ApplicationStatus,
} from '../../shared/contracts';
import {
  RuleLifecycleStatus,
  RuleSourceClassification,
  RuleType,
  ChecklistItemType,
} from '../../rules/enums';
import { ApplicableRulesResolutionProjection } from '../../rules/dto';

describe('ComplianceEvidenceEvaluatorService', () => {
  let service: ComplianceEvidenceEvaluatorService;

  const mockRuleResolution: ApplicableRulesResolutionProjection = {
    ruleSet: {
      id: 'rs-uuid-1',
      code: 'RULESET-ENGG-UG',
      name: 'AICTE UG Engineering Regulatory Norms',
      applicationCategory: 'Undergraduate Engineering',
      issuingAuthority: 'AICTE',
    },
    ruleVersion: {
      id: 'rv-uuid-1',
      versionNumber: 1,
      status: RuleLifecycleStatus.PUBLISHED,
      effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
      effectiveTo: null,
      sourceTitle: 'AICTE Approval Process Handbook (APH) 2024-2027',
      sourceReference: 'AICTE APH 2024-27 Chapter 1 & 2',
      sourceClassification:
        RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
      publishedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    evaluationDate: '2026-10-25',
    rules: [
      {
        id: 'rule-uuid-1',
        ruleVersionId: 'rv-uuid-1',
        ruleCode: 'RULE-LAND-01',
        title: 'Minimum Land Requirement for Rural UG Engineering',
        description: 'Institutions must possess at least 7.5 acres.',
        ruleType: RuleType.INFRASTRUCTURE_LAND,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        parametersJsonb: {
          minLandAcres: 7.5,
          areaType: 'RURAL',
        },
        sourceClause: 'APH 2024-27 Clause 1.4.1',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-uuid-2',
        ruleVersionId: 'rv-uuid-1',
        ruleCode: 'RULE-BUILTUP-01',
        title: 'Minimum Built-up Area for Engineering Intake',
        description: 'Must maintain at least 4,000 square meters.',
        ruleType: RuleType.INFRASTRUCTURE_BUILTUP,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        parametersJsonb: {
          minBuiltUpAreaSqMeters: 4000,
          baseStudentIntake: 300,
        },
        sourceClause: 'APH 2024-27 Clause 1.4.3',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-uuid-3',
        ruleVersionId: 'rv-uuid-1',
        ruleCode: 'RULE-FACULTY-01',
        title: 'Student to Faculty Cadre Ratio',
        description: 'Student-to-faculty ratio must not exceed 20:1.',
        ruleType: RuleType.FACULTY_RATIO,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        parametersJsonb: {
          maxStudentFacultyRatio: 20,
        },
        sourceClause: 'APH 2024-27 Clause 2.1.2',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-uuid-4',
        ruleVersionId: 'rv-uuid-1',
        ruleCode: 'RULE-BARRIER-01',
        title: 'Barrier-Free Environment and Accessibility',
        description: 'Ramps, accessible elevators, and toilets required.',
        ruleType: RuleType.BARRIER_FREE_ENVIRONMENT,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        parametersJsonb: {
          rampsRequired: true,
          accessibleToiletsRequired: true,
        },
        sourceClause: 'APH 2024-27 Clause 1.5',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    checklists: [
      {
        id: 'chk-uuid-1',
        ruleVersionId: 'rv-uuid-1',
        code: 'CHK-ENGG-UG-INTAKE',
        name: 'UG Engineering Mandatory Intake Checklist',
        applicationCategory: 'Undergraduate Engineering',
        items: [
          {
            id: 'item-uuid-1',
            checklistTemplateId: 'chk-uuid-1',
            itemCode: 'CHK-ITEM-LAND-DEED',
            description: 'Registered Sale Deed or 30-Year Lease Deed',
            itemType: ChecklistItemType.DOCUMENT_UPLOAD,
            required: true,
            evidenceDocumentType: 'LAND_TITLE_DEED',
            displayOrder: 10,
            ruleId: 'rule-uuid-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'item-uuid-2',
            checklistTemplateId: 'chk-uuid-1',
            itemCode: 'CHK-ITEM-BUILDING-PLAN',
            description: 'Approved Building Plan from Municipal Authority',
            itemType: ChecklistItemType.DOCUMENT_UPLOAD,
            required: true,
            evidenceDocumentType: 'BUILDING_PLAN_APPROVAL',
            displayOrder: 20,
            ruleId: 'rule-uuid-2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const createMockApplication = (
    payloadOverrides: Record<string, any> = {},
  ): Application => {
    return {
      id: 'app-uuid-101',
      applicationNumber: 'APP-2026-TEST-001',
      institutionId: 'inst-uuid-101',
      academicYear: '2026-2027',
      programType: 'Undergraduate Engineering',
      status: ApplicationStatus.DRAFT,
      payloadJsonb: {
        landAreaAcres: 8.0,
        builtUpAreaSqMeters: 5000,
        declaredIntake: 300,
        facultyCount: 20,
        barrierFreeFacilities: true,
        ...payloadOverrides,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Application;
  };

  beforeEach(() => {
    service = new ComplianceEvidenceEvaluatorService();
  });

  it('flags missing mandatory checklist documents as CRITICAL_DEFICIENCY', () => {
    const app = createMockApplication();
    const documents: Document[] = []; // Zero documents attached

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const missingLand = findings.find(
      (f) =>
        f.findingCode === 'DEF_MANDATORY_DOCUMENT_MISSING' &&
        f.checklistItemCode === 'CHK-ITEM-LAND-DEED',
    );
    expect(missingLand).toBeDefined();
    expect(missingLand?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    expect(missingLand?.isAdvisory).toBe(true);
    expect(missingLand?.checklistTemplateCode).toBe('CHK-ENGG-UG-INTAKE');
  });

  it('flags document pending OCR extraction as FLAG_EVIDENCE_UNPROCESSED', () => {
    const app = createMockApplication();
    const documents: Document[] = [
      {
        id: 'doc-uuid-1',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed.pdf',
        processingStatus: DocumentProcessingStatus.PROCESSING_OCR,
        metadata: {},
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const pendingFinding = findings.find(
      (f) => f.findingCode === 'FLAG_EVIDENCE_UNPROCESSED',
    );
    expect(pendingFinding).toBeDefined();
    expect(pendingFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    expect(pendingFinding?.evidence[0].documentId).toBe('doc-uuid-1');
  });

  it('flags document failed OCR as FLAG_EVIDENCE_UNREADABLE', () => {
    const app = createMockApplication();
    const documents: Document[] = [
      {
        id: 'doc-uuid-1',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed_blurry.pdf',
        processingStatus: DocumentProcessingStatus.FAILED_OCR,
        metadata: {},
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const unreadable = findings.find(
      (f) => f.findingCode === 'FLAG_EVIDENCE_UNREADABLE',
    );
    expect(unreadable).toBeDefined();
    expect(unreadable?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
  });

  it('flags land area deficit as DEF_LAND_AREA_INSUFFICIENT when acreage < 7.5 acres', () => {
    const app = createMockApplication({ landAreaAcres: 5.0 });
    const documents: Document[] = [
      {
        id: 'doc-uuid-1',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              landAreaAcres: 5.0,
            },
          },
        },
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const landDeficit = findings.find(
      (f) => f.findingCode === 'DEF_LAND_AREA_INSUFFICIENT',
    );
    expect(landDeficit).toBeDefined();
    expect(landDeficit?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    expect(landDeficit?.ruleCode).toBe('RULE-LAND-01');
    expect(landDeficit?.requiresPhysicalInspection).toBe(true);
  });

  it('marks land norm satisfied as COMPLIANT when acreage >= 7.5 acres', () => {
    const app = createMockApplication({ landAreaAcres: 8.5 });
    const documents: Document[] = [
      {
        id: 'doc-uuid-1',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              landAreaAcres: 8.5,
            },
          },
        },
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const landCompliant = findings.find(
      (f) => f.findingCode === 'COMPL_LAND_NORM_SATISFIED',
    );
    expect(landCompliant).toBeDefined();
    expect(landCompliant?.severity).toBe(ComplianceSeverity.COMPLIANT);
  });

  it('flags built-up area deficit as DEF_BUILTUP_DEFICIT when area < 4000 sq.m', () => {
    const app = createMockApplication({ builtUpAreaSqMeters: 3200 });
    const documents: Document[] = [
      {
        id: 'doc-uuid-2',
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'sanction_plan.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              totalBuiltUpAreaSqm: 3200,
            },
          },
        },
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const builtUpDeficit = findings.find(
      (f) => f.findingCode === 'DEF_BUILTUP_DEFICIT',
    );
    expect(builtUpDeficit).toBeDefined();
    expect(builtUpDeficit?.severity).toBe(
      ComplianceSeverity.CRITICAL_DEFICIENCY,
    );
  });

  it('flags student-to-faculty ratio deficit as DEF_FACULTY_RATIO_EXCEEDED when ratio > 20:1', () => {
    const app = createMockApplication({
      declaredIntake: 300,
      facultyCount: 10, // 30:1 > 20:1
    });
    const documents: Document[] = [];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const facultyFinding = findings.find(
      (f) => f.findingCode === 'DEF_FACULTY_RATIO_EXCEEDED',
    );
    expect(facultyFinding).toBeDefined();
    expect(facultyFinding?.severity).toBe(
      ComplianceSeverity.CRITICAL_DEFICIENCY,
    );
    expect(facultyFinding?.ruleCode).toBe('RULE-FACULTY-01');
  });

  it('flags expired fire safety certificate as FLAG_FIRE_NOC_EXPIRED', () => {
    const app = createMockApplication();
    const documents: Document[] = [
      {
        id: 'doc-fire-1',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'fire_noc_2023.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'MH-FIRE-2023-881',
              expiryDate: '2024-03-31T00:00:00.000Z',
            },
          },
        },
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const expiredFire = findings.find(
      (f) => f.findingCode === 'FLAG_FIRE_NOC_EXPIRED',
    );
    expect(expiredFire).toBeDefined();
    expect(expiredFire?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
  });

  it('marks unexpired fire safety certificate as COMPLIANT', () => {
    const app = createMockApplication();
    const documents: Document[] = [
      {
        id: 'doc-fire-1',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'fire_noc_valid.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'MH-FIRE-2026-991',
              expiryDate: '2028-05-31T00:00:00.000Z',
            },
          },
        },
      } as unknown as Document,
    ];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    const validFire = findings.find(
      (f) => f.findingCode === 'COMPL_FIRE_NOC_VALID',
    );
    expect(validFire).toBeDefined();
    expect(validFire?.severity).toBe(ComplianceSeverity.COMPLIANT);
    expect(validFire?.requiresPhysicalInspection).toBe(true);
  });

  it('handles null resolution with WARN_NO_PUBLISHED_RULES advisory finding', () => {
    const app = createMockApplication();
    const documents: Document[] = [];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      null,
      '2026-10-25',
    );

    const warning = findings.find(
      (f) => f.findingCode === 'WARN_NO_PUBLISHED_RULES',
    );
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe(ComplianceSeverity.UNVERIFIED_POLICY);
    expect(warning?.isAdvisory).toBe(true);
  });

  it('guarantees all findings strictly declare isAdvisory: true per ADR-004', () => {
    const app = createMockApplication();
    const documents: Document[] = [];

    const findings = service.evaluateRulesAndChecklists(
      app,
      documents,
      mockRuleResolution,
      '2026-10-25',
    );

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.isAdvisory).toBe(true);
    }
  });
});
