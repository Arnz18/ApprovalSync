/**
 * ApprovalSync — OCR Provider Interface & Types
 * Milestone: DOC-02
 *
 * Defines vendor-neutral abstractions for optical character recognition,
 * tokenization, bounding box spatial mapping, and provider metadata.
 */

import { BoundingBox } from '../../shared/contracts';

export interface OcrToken {
  text: string;
  confidence: number; // 0.0 to 1.0
  pageNumber: number;
  boundingBox: BoundingBox;
}

export interface OcrPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
  confidence: number;
  tokens: OcrToken[];
}

export interface OcrProviderMetadata {
  providerId: string;
  isMock: boolean;
  engineVersion?: string;
  processingTimeMs: number;
  modelInfo?: string;
  disclaimer?: string;
}

export interface OcrExtractionResult {
  rawText: string;
  tokens: OcrToken[];
  pages: OcrPage[];
  confidenceScore: number; // 0.0 to 1.0
  providerMetadata: OcrProviderMetadata;
}

export interface OcrProcessingOptions {
  simulateTimeout?: boolean;
  simulateLowConfidence?: boolean;
  simulateCorruptedFile?: boolean;
  maxPages?: number;
}

export interface IOcrProvider {
  readonly providerId: string;
  readonly isLiveProviderConfigured: boolean;

  /**
   * Extracts machine-readable text, structured tokens, and bounding box coordinates
   * from a supported document binary buffer (PDF, JPEG, PNG).
   */
  extractTextAndTokens(
    fileBuffer: Buffer,
    mimeType: string,
    options?: OcrProcessingOptions,
  ): Promise<OcrExtractionResult>;
}

export const OCR_PROVIDER_TOKEN = 'OCR_PROVIDER_TOKEN';
