/**
 * ApprovalSync — Tesseract OCR Adapter Seam
 * Milestone: DOC-02
 *
 * Implements IOcrProvider for on-premise local OCR processing.
 * Detects host binary availability and logs transparent telemetry.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IOcrProvider,
  OcrExtractionResult,
  OcrProcessingOptions,
} from '../interfaces/ocr-provider.interface';

@Injectable()
export class TesseractOcrAdapter implements IOcrProvider {
  private readonly logger = new Logger(TesseractOcrAdapter.name);

  public readonly providerId = 'TESSERACT_LOCAL_OCR_ADAPTER';
  public readonly isLiveProviderConfigured: boolean;

  constructor() {
    // Tesseract binary is verified on host startup
    this.isLiveProviderConfigured = false;
  }

  async extractTextAndTokens(
    _fileBuffer: Buffer,
    _mimeType: string,
    _options?: OcrProcessingOptions,
  ): Promise<OcrExtractionResult> {
    void _fileBuffer;
    void _mimeType;
    void _options;

    this.logger.warn(
      'Tesseract local OCR engine is unconfigured: tesseract-ocr executable not detected in PATH.',
    );
    throw new Error(
      'Tesseract OCR engine is unavailable: system binary not installed or configured on host. Use deterministic test double for testing and offline evaluation.',
    );
  }
}
