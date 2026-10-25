/**
 * ApprovalSync — Issuer Verification Service Tests
 * Milestone: DOC-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { IssuerVerificationService } from './issuer-verification.service';
import { ProviderRegistryService } from './provider-registry.service';
import { Document } from '../../database/entities/document.entity';
import { Application } from '../../database/entities/application.entity';
import { STORAGE_ADAPTER_TOKEN } from '../../documents/interfaces/storage-adapter.interface';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { UserRole, VerificationStatus } from '../../shared/contracts';
import {
  IVerificationProvider,
  NormalizedVerificationResponse,
  ProviderCapability,
  ProviderVerificationOutcome,
} from '../interfaces';

describe('IssuerVerificationService', () => {
  let service: IssuerVerificationService;
  let mockDocRepo: any;
  let mockAppRepo: any;
  let mockStorageAdapter: any;
  let mockRegistry: any;

  const instUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    name: 'Inst User 1',
    email: 'user@inst-1.local',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-uuid-1',
  };

  const otherInstUser: AuthUserPrincipal = {
    id: 'user-inst-2',
    name: 'Inst User 2',
    email: 'user@inst-2.local',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-uuid-2',
  };

  const officerUser: AuthUserPrincipal = {
    id: 'user-officer-1',
    name: 'Officer User',
    email: 'officer@aicte.local',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const testDoc: Partial<Document> = {
    id: 'doc-uuid-1',
    applicationId: 'app-uuid-1',
    documentType: 'LAND_TITLE_DEED',
    fileName: 'deed.pdf',
    fileHashSha256: 'a'.repeat(64),
    metadata: {
      analysisReport: {
        extractedFields: {
          deedNumber: 'MAH-PUN-2024-REG-09821',
          khasraNumber: '42/1A',
          district: 'Pune',
          state: 'Maharashtra',
        },
      },
    },
    application: {
      id: 'app-uuid-1',
      institutionId: 'inst-uuid-1',
      institution: {
        id: 'inst-uuid-1',
        name: 'Demo Institute of Technology',
        state: 'Maharashtra',
        district: 'Pune',
      },
    } as any,
  };

  const mockProviderResponse: NormalizedVerificationResponse = {
    documentId: 'doc-uuid-1',
    status: VerificationStatus.VERIFIED_MOCK,
    outcome: ProviderVerificationOutcome.VERIFIED,
    sourceId: 'SIMULATED_ISSUER_ADAPTER',
    sourceName: 'Simulated DigiLocker & State Registry Sandbox',
    isSimulated: true,
    verifiedAt: new Date().toISOString(),
    sourceReference: 'TXN-MH-PUN-2024-88412-SIMULATED',
    comparisonSummary: 'Document record matches simulated registry.',
    matchedFields: [],
    discrepantFields: [],
    limitations: ['Simulated verification double.'],
    isAdvisory: true,
  };

  const mockProvider: IVerificationProvider = {
    providerId: 'SIMULATED_ISSUER_ADAPTER',
    providerName: 'Simulated DigiLocker & State Registry Sandbox',
    isSimulated: true,
    isLiveProviderConfigured: true,
    supportedDocumentTypes: ['LAND_TITLE_DEED'],
    capabilities: [ProviderCapability.LAND_RECORD_SEARCH],
    supports: jest.fn().mockReturnValue(true),
    verify: jest.fn().mockResolvedValue(mockProviderResponse),
  };

  beforeEach(async () => {
    mockDocRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((doc) => Promise.resolve(doc)),
    };

    mockAppRepo = {
      findOne: jest.fn(),
    };

    mockStorageAdapter = {
      getBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    };

    mockRegistry = {
      getAllProviders: jest.fn().mockReturnValue([mockProvider]),
      resolveProvider: jest.fn().mockReturnValue(mockProvider),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuerVerificationService,
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
          provide: ProviderRegistryService,
          useValue: mockRegistry,
        },
      ],
    }).compile();

    service = module.get<IssuerVerificationService>(IssuerVerificationService);
  });

  describe('listAvailableProviders', () => {
    it('should list all available providers with simulation flags', () => {
      const result = service.listAvailableProviders();
      expect(result.length).toBe(1);
      expect(result[0].providerId).toBe('SIMULATED_ISSUER_ADAPTER');
      expect(result[0].isSimulated).toBe(true);
      expect(result[0].disclaimer).toBeDefined();
    });
  });

  describe('verifyDocumentIssuer - Tenancy & Authorization', () => {
    it('should throw NotFoundException when document does not exist', async () => {
      mockDocRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyDocumentIssuer('non-existent-uuid', instUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when INSTITUTION_USER accesses document of another institution', async () => {
      mockDocRepo.findOne.mockResolvedValue(testDoc);

      await expect(
        service.verifyDocumentIssuer('doc-uuid-1', otherInstUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should permit INSTITUTION_USER to verify document belonging to their own institution', async () => {
      mockDocRepo.findOne.mockResolvedValue({ ...testDoc, metadata: {} });

      const result = await service.verifyDocumentIssuer('doc-uuid-1', instUser);
      expect(result).toBeDefined();
      expect(result.status).toBe(VerificationStatus.VERIFIED_MOCK);
    });

    it('should permit SCRUTINY_OFFICER to verify document across institutions', async () => {
      mockDocRepo.findOne.mockResolvedValue({ ...testDoc, metadata: {} });

      const result = await service.verifyDocumentIssuer(
        'doc-uuid-1',
        officerUser,
      );
      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc-uuid-1');
    });
  });

  describe('verifyDocumentIssuer - Execution & Persistence', () => {
    it('should extract fields from DOC-02 OCR analysis report and pass to provider', async () => {
      mockDocRepo.findOne.mockResolvedValue({
        ...testDoc,
        metadata: { ...testDoc.metadata },
      });

      await service.verifyDocumentIssuer('doc-uuid-1', instUser);

      expect(mockRegistry.resolveProvider).toHaveBeenCalledWith(
        undefined,
        'LAND_TITLE_DEED',
      );
      expect(mockProvider.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-uuid-1',
          documentNumber: 'MAH-PUN-2024-REG-09821',
          khasraNumber: '42/1A',
          state: 'Maharashtra',
          district: 'Pune',
        }),
      );
    });

    it('should persist verification result in document.metadata.issuerVerification', async () => {
      const docToSave = { ...testDoc, metadata: {} };
      mockDocRepo.findOne.mockResolvedValue(docToSave);

      const result = await service.verifyDocumentIssuer('doc-uuid-1', instUser);

      expect(mockDocRepo.save).toHaveBeenCalled();
      expect((docToSave.metadata as any).issuerVerification).toBeDefined();
      expect(result.status).toBe(VerificationStatus.VERIFIED_MOCK);
      expect(result.isSimulated).toBe(true);
      expect(result.isAdvisory).toBe(true);
    });
  });

  describe('getDocumentIssuerVerification', () => {
    it('should throw NotFoundException if no verification was ever performed', async () => {
      mockDocRepo.findOne.mockResolvedValue({
        ...testDoc,
        metadata: {},
      });

      await expect(
        service.getDocumentIssuerVerification('doc-uuid-1', instUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return previously persisted issuer verification findings', async () => {
      mockDocRepo.findOne.mockResolvedValue({
        ...testDoc,
        metadata: {
          issuerVerification: mockProviderResponse,
        },
      });

      const result = await service.getDocumentIssuerVerification(
        'doc-uuid-1',
        instUser,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(VerificationStatus.VERIFIED_MOCK);
      expect(result.comparisonSummary).toBe(
        mockProviderResponse.comparisonSummary,
      );
    });
  });
});
