/**
 * ApprovalSync — Document AI Controller
 * Milestone: DOC-02
 *
 * Exposes endpoints for executing document OCR extraction, category classification,
 * structured field analysis, and spatial evidence retrieval.
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import { AiDocumentProcessorService } from './services/ai-document-processor.service';
import {
  DirectClassifyDto,
  DocumentAnalysisResponseDto,
  ProcessDocumentDto,
} from './dto';

@ApiTags('Document AI & Verification')
@ApiBearerAuth('jwt')
@Controller()
export class AiController {
  constructor(private readonly processorService: AiDocumentProcessorService) {}

  @Post('documents/:id/process')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({
    summary: 'Process document OCR and structured extraction',
    description:
      'Extracts text via OCR, classifies document category, extracts structured statutory fields, binds bounding box evidence, and calculates confidence scores.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID to process',
  })
  @ApiResponse({
    status: 200,
    description: 'Document successfully processed or analysis returned',
    type: DocumentAnalysisResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Tenancy mismatch: Cannot process documents for another institution',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async processDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Body() options?: ProcessDocumentDto,
  ): Promise<DocumentAnalysisResponseDto> {
    return this.processorService.processDocument(id, user, options);
  }

  @Get('documents/:id/analysis')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Retrieve document analysis report and evidence locations',
    description:
      'Retrieves the structured extraction findings, spatial bounding boxes, confidence scores, and advisory anomaly flags for an uploaded document.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis report and evidence locations',
    type: DocumentAnalysisResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<DocumentAnalysisResponseDto> {
    return this.processorService.getAnalysisReport(id, user);
  }

  @Post('ai/classify')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({
    summary: 'Direct document text classification',
    description:
      'Classifies arbitrary text against AICTE regulatory document categories.',
  })
  @ApiResponse({
    status: 200,
    description: 'Document category classification result',
  })
  async classifyDirect(@Body() dto: DirectClassifyDto) {
    return this.processorService.classifyText(dto.text || '');
  }
}
