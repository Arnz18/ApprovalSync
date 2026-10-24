/**
 * ApprovalSync — Document Duplicate Detection Service Tests
 * Milestone: DOC-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentDuplicateDetectionService } from './document-duplicate-detection.service';
import { NearDuplicateDetectionService } from './near-duplicate-detection.service';
import { Document } from '../../database/entities/document.entity';
import { Application } from '../../database/entities/application.entity';
import { STORAGE_ADAPTER_TOKEN } from '../../documents/interfaces/storage-adapter.interface';
import { UserRole, ComplianceSeverity } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { ValidationOutcome } from '../enums';

describe('DocumentDuplicateDetectionService', () => {
  let service: DocumentDuplicateDetectionService;
  let mockDocRepo: any;
  let mockAppRepo: any;
  let mockStorageAdapter: any;
  let mockNearDupService: any;

  const mockInstitutionUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    email: 'principal@apex.edu',
    name: 'Principal User',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-apex-1',
  };

  const mockScrutinyOfficer: AuthUserPrincipal = {
    id: 'officer-1',
    email: 'officer@aicte.gov.in',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const mockApplication: Application = {
    id: 'app-1',
    applicationNumber: 'APP-2026-0001',
    institutionId: 'inst-apex-1',
    programType: 'ENGINEERING_TECHNOLOGY',
  } as Application;

  beforeEach(async () => {
    mockDocRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((doc) => Promise.resolve(doc)),
    };

    mockAppRepo = {
      findOne: jest.fn().mockResolvedValue(mockApplication),
    };

    mockStorageAdapter = {
      getBuffer: jest.fn().mockResolvedValue(Buffer.from('sample-doc-content')),
    };

    mockNearDupService = {
      evaluateApplicationNearDuplicates: jest.fn().mockReturnValue({
        findings: [],
        nearDuplicates: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentDuplicateDetectionService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocRepo,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockAppRepo,
        },
        {
          provide: STORAGE_ADAPTER_TOKEN,
          useValue: mockStorageAdapter,
        },
        {
          provide: NearDuplicateDetectionService,
          useValue: mockNearDupService,
        },
      ],
    }).compile();

    service = module.get<DocumentDuplicateDetectionService>(
      DocumentDuplicateDetectionService,
    );
  });

  describe('Intra-application Duplicate Detection', () => {
    it('should flag duplicate files uploaded within the same application dossier', async () => {
      const doc1 = {
        id: 'doc-1',
        fileName: 'deed_copy_1.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'sha256-identical-hash-1234567890abcdef',
        storagePath: 'documents/app-1/doc-1.pdf',
      } as Document;

      const doc2 = {
        id: 'doc-2',
        fileName: 'deed_copy_2.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'sha256-identical-hash-1234567890abcdef',
        storagePath: 'documents/app-1/doc-2.pdf',
      } as Document;

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc1, doc2],
        mockInstitutionUser,
      );

      expect(result.exactDuplicatesCount).toBe(2);
      const duplicateFindings = result.findings.filter(
        (f) => f.ruleId === 'DOC-DUP-EXACT-INTRA-APP',
      );
      expect(duplicateFindings.length).toBe(2);
      expect(duplicateFindings[0].outcome).toBe(
        ValidationOutcome.EXACT_DUPLICATE,
      );
      expect(duplicateFindings[0].severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
      expect(duplicateFindings[0].isAdvisory).toBe(true);
      expect(duplicateFindings[0].metadata?.duplicateDocumentIds).toContain(
        'doc-2',
      );
    });
  });

  describe('Inter-application Duplicate (Same Institution)', () => {
    it('should flag document previously submitted in another application of the same institution with advisory severity', async () => {
      const doc = {
        id: 'doc-current',
        fileName: 'perpetual_deed.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'sha256-same-inst-hash',
        storagePath: 'documents/app-1/doc-current.pdf',
      } as Document;

      // Mock prior document from another application of same institution
      mockDocRepo.find.mockResolvedValue([
        {
          id: 'doc-prior',
          fileName: 'prior_deed.pdf',
          fileHashSha256: 'sha256-same-inst-hash',
          applicationId: 'app-prior-2025',
          application: {
            id: 'app-prior-2025',
            applicationNumber: 'APP-2025-8888',
            institutionId: 'inst-apex-1', // Same institution!
            institution: { name: 'Apex Institute of Technology' },
          },
        },
      ]);

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc],
        mockInstitutionUser,
      );

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-DUP-EXACT-SAME-INSTITUTION',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.EXACT_DUPLICATE);
      expect(finding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(finding?.message).toContain('APP-2025-8888');
      expect(finding?.metadata?.matchedApplicationNumber).toBe('APP-2025-8888');
    });
  });

  describe('Cross-Institution Duplicate Collision & Tenant Privacy', () => {
    const foreignDocMatch = {
      id: 'doc-foreign-999',
      fileName: 'stolen_fire_noc.pdf',
      fileHashSha256: 'sha256-cross-tenant-collision',
      applicationId: 'app-foreign-2',
      application: {
        id: 'app-foreign-2',
        applicationNumber: 'APP-2026-9999',
        institutionId: 'inst-zenith-2', // Different institution!
        institution: { name: 'Zenith College of Engineering' },
      },
    };

    it('should REDACT foreign institution details when accessed by INSTITUTION_USER', async () => {
      const doc = {
        id: 'doc-current',
        fileName: 'fire_noc.pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileHashSha256: 'sha256-cross-tenant-collision',
        storagePath: 'documents/app-1/doc-current.pdf',
      } as Document;

      mockDocRepo.find.mockResolvedValue([foreignDocMatch]);

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc],
        mockInstitutionUser,
      );

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-DUP-EXACT-CROSS-INSTITUTION',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.EXACT_DUPLICATE);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);

      // Must NOT leak foreign institution name or IDs to applicant
      expect(finding?.message).not.toContain('Zenith');
      expect(finding?.message).not.toContain('APP-2026-9999');
      expect(finding?.metadata?.matchedInstitutionName).toBeUndefined();
      expect(finding?.metadata?.matchedApplicationId).toBeUndefined();
      expect(finding?.metadata?.redacted).toBe(true);
    });

    it('should DISCLOSE supervisory details to SCRUTINY_OFFICER for regulatory review', async () => {
      const doc = {
        id: 'doc-current',
        fileName: 'fire_noc.pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileHashSha256: 'sha256-cross-tenant-collision',
        storagePath: 'documents/app-1/doc-current.pdf',
      } as Document;

      mockDocRepo.find.mockResolvedValue([foreignDocMatch]);

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc],
        mockScrutinyOfficer,
      );

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-DUP-EXACT-CROSS-INSTITUTION',
      );
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('Zenith College of Engineering');
      expect(finding?.message).toContain('APP-2026-9999');
      expect(finding?.metadata?.matchedInstitutionName).toBe(
        'Zenith College of Engineering',
      );
      expect(finding?.metadata?.matchedApplicationNumber).toBe('APP-2026-9999');
      expect(finding?.metadata?.matchedDocumentId).toBe('doc-foreign-999');
    });
  });

  describe('Unique Documents (Compliant)', () => {
    it('should generate COMPLIANT finding when document hash is completely unique', async () => {
      const doc = {
        id: 'doc-unique',
        fileName: 'unique_land_deed.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'sha256-truly-unique-hash-value',
        storagePath: 'documents/app-1/doc-unique.pdf',
      } as Document;

      mockDocRepo.find.mockResolvedValue([]);

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc],
        mockInstitutionUser,
      );

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-DUP-EXACT-UNIQUE',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.VALID);
      expect(finding?.severity).toBe(ComplianceSeverity.COMPLIANT);
      expect(finding?.isAdvisory).toBe(true);
    });
  });

  describe('Storage Verification & Checksum Mismatch Handling', () => {
    it('should flag anomaly when stored hash differs from recomputed storage file hash', async () => {
      const doc = {
        id: 'doc-tampered-hash',
        fileName: 'modified.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'old-stored-hash-00000000000000000000',
        storagePath: 'documents/app-1/modified.pdf',
      } as Document;

      // Storage returns buffer whose SHA-256 differs
      mockStorageAdapter.getBuffer.mockResolvedValue(
        Buffer.from('newly-altered-content-in-storage'),
      );

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc],
        mockInstitutionUser,
        true, // verifyStorage: true
      );

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-DUP-CHECKSUM-MISMATCH',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    });

    it('should report SOURCE_UNAVAILABLE when document file cannot be read from storage', async () => {
      const doc = {
        id: 'doc-missing-storage',
        fileName: 'missing.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: '', // absent, forces recompute
        storagePath: 'documents/app-1/missing.pdf',
      } as Document;

      mockStorageAdapter.getBuffer.mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );

      const result = await service.evaluateDuplicates(
        mockApplication,
        [doc],
        mockInstitutionUser,
      );

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-DUP-STORAGE-UNAVAILABLE',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.SOURCE_UNAVAILABLE);
    });
  });
});
