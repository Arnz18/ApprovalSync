/**
 * ApprovalSync — Providers Controller Tests
 * Milestone: DOC-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { IssuerVerificationService } from './services/issuer-verification.service';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole, VerificationStatus } from '../shared/contracts';
import { ProviderVerificationOutcome } from './interfaces';
import { IssuerVerificationResultDto, ProviderDiscoveryDto } from './dto';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let mockVerificationService: Partial<IssuerVerificationService>;

  const mockUser: AuthUserPrincipal = {
    id: 'user-1',
    name: 'Test User',
    email: 'user@test.local',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
  };

  const mockResult: IssuerVerificationResultDto = {
    documentId: 'doc-1',
    applicationId: 'app-1',
    documentType: 'LAND_TITLE_DEED',
    status: VerificationStatus.VERIFIED_MOCK,
    outcome: ProviderVerificationOutcome.VERIFIED,
    sourceId: 'SIMULATED_ISSUER_ADAPTER',
    sourceName: 'Simulated DigiLocker & State Registry Sandbox',
    isSimulated: true,
    comparisonSummary: 'Verified against simulated registry.',
    matchedFields: [],
    discrepantFields: [],
    limitations: [],
    isAdvisory: true,
  };

  const mockDiscovery: ProviderDiscoveryDto[] = [
    {
      providerId: 'SIMULATED_ISSUER_ADAPTER',
      providerName: 'Simulated DigiLocker & State Registry Sandbox',
      isSimulated: true,
      isLiveProviderConfigured: true,
      supportedDocumentTypes: ['LAND_TITLE_DEED'],
      capabilities: ['LAND_RECORD_SEARCH'],
      disclaimer: 'Simulated double.',
    },
  ];

  beforeEach(async () => {
    mockVerificationService = {
      listAvailableProviders: jest.fn().mockReturnValue(mockDiscovery),
      verifyDocumentIssuer: jest.fn().mockResolvedValue(mockResult),
      getDocumentIssuerVerification: jest.fn().mockResolvedValue(mockResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        {
          provide: IssuerVerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  describe('listProviders', () => {
    it('should return catalog of registered providers', () => {
      const result = controller.listProviders();
      expect(result).toBe(mockDiscovery);
      expect(mockVerificationService.listAvailableProviders).toHaveBeenCalled();
    });
  });

  describe('verifyIssuer', () => {
    it('should delegate verification to IssuerVerificationService with document ID and user principal', async () => {
      const dto = { simulateScenario: 'MATCH' as const };
      const result = await controller.verifyIssuer('doc-1', mockUser, dto);

      expect(result).toBe(mockResult);
      expect(mockVerificationService.verifyDocumentIssuer).toHaveBeenCalledWith(
        'doc-1',
        mockUser,
        dto,
      );
    });
  });

  describe('getIssuerVerification', () => {
    it('should retrieve existing issuer findings for document', async () => {
      const result = await controller.getIssuerVerification('doc-1', mockUser);

      expect(result).toBe(mockResult);
      expect(
        mockVerificationService.getDocumentIssuerVerification,
      ).toHaveBeenCalledWith('doc-1', mockUser);
    });
  });
});
