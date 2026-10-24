/**
 * ApprovalSync — AI Controller Unit Tests
 * Milestone: DOC-02
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiDocumentProcessorService } from './services/ai-document-processor.service';
import { DocumentProcessingStatus, UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { DocumentAnalysisResponseDto } from './dto';

describe('AiController', () => {
  let controller: AiController;
  let processorService: jest.Mocked<AiDocumentProcessorService>;

  const mockUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    email: 'inst@test.local',
    name: 'Institution User',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
  };

  const mockAnalysisReport: DocumentAnalysisResponseDto = {
    documentId: 'doc-uuid-1',
    processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
    ocrConfidence: 0.95,
    extractedFields: { deedNumber: 'DEED/2024/7891' },
    findings: [],
    anomalyFlags: [],
    processedAt: '2026-10-24T18:00:00.000Z',
  };

  beforeEach(async () => {
    processorService = {
      processDocument: jest.fn().mockResolvedValue(mockAnalysisReport),
      getAnalysisReport: jest.fn().mockResolvedValue(mockAnalysisReport),
      classifyText: jest.fn().mockResolvedValue({
        category: 'LAND_TITLE_DEED',
        confidenceScore: 0.95,
      }),
    } as unknown as jest.Mocked<AiDocumentProcessorService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiDocumentProcessorService,
          useValue: processorService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  describe('processDocument()', () => {
    it('should delegate processDocument call to processorService', async () => {
      const result = await controller.processDocument('doc-uuid-1', mockUser, {
        forceReprocess: true,
      });

      expect(processorService.processDocument).toHaveBeenCalledWith(
        'doc-uuid-1',
        mockUser,
        { forceReprocess: true },
      );
      expect(result).toEqual(mockAnalysisReport);
    });
  });

  describe('getAnalysis()', () => {
    it('should delegate getAnalysis call to processorService', async () => {
      const result = await controller.getAnalysis('doc-uuid-1', mockUser);

      expect(processorService.getAnalysisReport).toHaveBeenCalledWith(
        'doc-uuid-1',
        mockUser,
      );
      expect(result).toEqual(mockAnalysisReport);
    });
  });

  describe('classifyDirect()', () => {
    it('should delegate classifyDirect to processorService.classifyText', async () => {
      const result = await controller.classifyDirect({
        text: 'sample deed text',
      });

      expect(processorService.classifyText).toHaveBeenCalledWith(
        'sample deed text',
      );
      expect(result).toBeDefined();
    });
  });
});
