/**
 * ApprovalSync — Deterministic OCR Adapter Unit Tests
 * Milestone: DOC-02
 */

import * as fs from 'fs';
import * as path from 'path';
import { DeterministicOcrAdapter } from './deterministic-ocr.adapter';
import { TesseractOcrAdapter } from './tesseract-ocr.adapter';
import { GoogleDocAiAdapter } from './google-docai.adapter';
import { ConfigService } from '@nestjs/config';

describe('DeterministicOcrAdapter & Adapter Seams', () => {
  let adapter: DeterministicOcrAdapter;
  const fixturesDir = path.resolve(
    __dirname,
    '../../../test/fixtures/documents',
  );

  beforeEach(() => {
    adapter = new DeterministicOcrAdapter();
  });

  describe('extractTextAndTokens() with Synthetic Documents', () => {
    it('should successfully extract text, lines, and spatial tokens from synthetic land title deed', async () => {
      const buffer = fs.readFileSync(
        path.join(fixturesDir, 'land-title-deed.pdf'),
      );
      const result = await adapter.extractTextAndTokens(
        buffer,
        'application/pdf',
      );

      expect(result).toBeDefined();
      expect(result.rawText).toContain('REGISTERED LEASE DEED');
      expect(result.rawText).toContain('DEED/2024/7891');
      expect(result.rawText).toContain('30 Years');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(result.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.tokens.length).toBeGreaterThan(10);

      // Verify spatial bounding box integrity
      const firstToken = result.tokens[0];
      expect(firstToken.pageNumber).toBe(1);
      expect(firstToken.boundingBox).toEqual({
        pageNumber: 1,
        xMin: expect.any(Number),
        yMin: expect.any(Number),
        xMax: expect.any(Number),
        yMax: expect.any(Number),
      });
      expect(firstToken.boundingBox.xMax).toBeGreaterThan(
        firstToken.boundingBox.xMin,
      );
      expect(firstToken.boundingBox.yMax).toBeGreaterThan(
        firstToken.boundingBox.yMin,
      );

      // Verify provider metadata
      expect(result.providerMetadata.providerId).toBe(
        'SYNTHETIC_DETERMINISTIC_OCR_ADAPTER',
      );
      expect(result.providerMetadata.isMock).toBe(true);
      expect(result.providerMetadata.processingTimeMs).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('should extract text from building plan approval PDF', async () => {
      const buffer = fs.readFileSync(
        path.join(fixturesDir, 'building-plan.pdf'),
      );
      const result = await adapter.extractTextAndTokens(
        buffer,
        'application/pdf',
      );

      expect(result.rawText).toContain('SANCTIONED BUILDING PLAN APPROVAL');
      expect(result.rawText).toContain('BPA-MC-2023-456');
      expect(result.rawText).toContain('5420.75');
    });

    it('should adjust confidence score below 0.85 when simulateLowConfidence option is active', async () => {
      const buffer = fs.readFileSync(
        path.join(fixturesDir, 'land-title-deed.pdf'),
      );
      const result = await adapter.extractTextAndTokens(
        buffer,
        'application/pdf',
        { simulateLowConfidence: true },
      );

      expect(result.confidenceScore).toBeLessThan(0.85);
      expect(result.confidenceScore).toBeGreaterThan(0.5);
    });

    it('should throw an error when simulateTimeout is specified', async () => {
      const buffer = fs.readFileSync(
        path.join(fixturesDir, 'land-title-deed.pdf'),
      );
      await expect(
        adapter.extractTextAndTokens(buffer, 'application/pdf', {
          simulateTimeout: true,
        }),
      ).rejects.toThrow('OCR engine timeout');
    });

    it('should throw an error when simulateCorruptedFile is specified', async () => {
      const buffer = fs.readFileSync(
        path.join(fixturesDir, 'land-title-deed.pdf'),
      );
      await expect(
        adapter.extractTextAndTokens(buffer, 'application/pdf', {
          simulateCorruptedFile: true,
        }),
      ).rejects.toThrow('Unrecoverable file corruption');
    });

    it('should throw when empty buffer is provided', async () => {
      await expect(
        adapter.extractTextAndTokens(Buffer.alloc(0), 'application/pdf'),
      ).rejects.toThrow('empty file buffer');
    });

    it('should throw when document has no extractable text or glyphs', async () => {
      const buffer = fs.readFileSync(
        path.join(fixturesDir, 'unreadable-scanned.pdf'),
      );
      await expect(
        adapter.extractTextAndTokens(buffer, 'application/pdf'),
      ).rejects.toThrow('Unreadable document');
    });
  });

  describe('TesseractOcrAdapter & GoogleDocAiAdapter Seams', () => {
    it('should report isLiveProviderConfigured as false and fail transparently for unconfigured Tesseract', async () => {
      const tesseract = new TesseractOcrAdapter();
      expect(tesseract.isLiveProviderConfigured).toBe(false);
      expect(tesseract.providerId).toBe('TESSERACT_LOCAL_OCR_ADAPTER');

      await expect(
        tesseract.extractTextAndTokens(Buffer.from('test'), 'application/pdf'),
      ).rejects.toThrow('Tesseract OCR engine is unavailable');
    });

    it('should report isLiveProviderConfigured as false when GCP credentials are missing', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const docAi = new GoogleDocAiAdapter(mockConfigService);
      expect(docAi.isLiveProviderConfigured).toBe(false);
      expect(docAi.providerId).toBe('GOOGLE_CLOUD_DOCUMENT_AI_ADAPTER');

      await expect(
        docAi.extractTextAndTokens(Buffer.from('test'), 'application/pdf'),
      ).rejects.toThrow('Google Cloud Document AI engine is unavailable');
    });
  });
});
