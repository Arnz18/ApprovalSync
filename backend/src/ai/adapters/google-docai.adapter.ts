/**
 * ApprovalSync — Google Cloud Document AI Adapter Seam
 * Milestone: DOC-02
 *
 * Implements IOcrProvider for enterprise cloud document understanding.
 * Inspects environment credentials and reports honest status.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IOcrProvider,
  OcrExtractionResult,
  OcrProcessingOptions,
} from '../interfaces/ocr-provider.interface';

@Injectable()
export class GoogleDocAiAdapter implements IOcrProvider {
  private readonly logger = new Logger(GoogleDocAiAdapter.name);

  public readonly providerId = 'GOOGLE_CLOUD_DOCUMENT_AI_ADAPTER';
  public readonly isLiveProviderConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('GCP_PROJECT_ID');
    const processorId = this.configService.get<string>(
      'GCP_DOCUMENT_AI_PROCESSOR_ID',
    );
    this.isLiveProviderConfigured = Boolean(projectId && processorId);
  }

  async extractTextAndTokens(
    _fileBuffer: Buffer,
    _mimeType: string,
    _options?: OcrProcessingOptions,
  ): Promise<OcrExtractionResult> {
    void _fileBuffer;
    void _mimeType;
    void _options;

    if (!this.isLiveProviderConfigured) {
      this.logger.warn(
        'Google Cloud Document AI is unconfigured: GCP_PROJECT_ID or GCP_DOCUMENT_AI_PROCESSOR_ID not provided.',
      );
      throw new Error(
        'Google Cloud Document AI engine is unavailable: cloud credentials not configured. Use deterministic test double for testing and offline evaluation.',
      );
    }

    throw new Error(
      'Google Cloud Document AI live API execution is not initialized.',
    );
  }
}
