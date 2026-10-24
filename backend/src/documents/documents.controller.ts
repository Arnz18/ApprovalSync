/**
 * ApprovalSync — Documents Controller
 * Milestone: DOC-01
 *
 * Implements REST endpoints for secure document upload, metadata retrieval,
 * streaming download, and deletion.
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile as NestUploadedFile,
  ParseUUIDPipe,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole, DocumentMetadata } from '../shared/contracts';
import {
  UploadDocumentDto,
  UploadDocumentDirectDto,
} from './dto/upload-document.dto';
import {
  DocumentMetadataDto,
  DocumentDeleteResponseDto,
} from './dto/document-response.dto';
import { UploadedFile } from './interfaces/file.interface';

const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15MB

@ApiTags('documents')
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload an attachment to an existing application.
   * Path: POST /api/v1/applications/:applicationId/documents
   */
  @Post('applications/:applicationId/documents')
  @Roles(UserRole.INSTITUTION_USER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_SIZE,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a document attachment for an application',
    description:
      'Uploads a PDF, JPEG, or PNG document. Validates magic bytes, checks file size limit (15MB), runs malware scan, generates server-controlled storage key, and calculates SHA-256 checksum.',
  })
  @ApiParam({
    name: 'applicationId',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multipart form data containing file and metadata',
    schema: {
      type: 'object',
      required: ['file', 'documentType'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document binary file (PDF, JPEG, or PNG, max 15MB)',
        },
        documentType: {
          type: 'string',
          example: 'LAND_TITLE_DEED',
          description: 'Document classification type identifier',
        },
        description: {
          type: 'string',
          example: '30-year registered lease deed',
          description: 'Optional human-readable notes',
        },
      },
    },
  })
  @SwaggerResponse({
    status: 201,
    description: 'Document uploaded and persisted successfully',
    type: DocumentMetadataDto,
  })
  @SwaggerResponse({
    status: 400,
    description:
      'Validation failure: empty file, invalid signature, MIME spoofing, or malware detected',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch or not an INSTITUTION_USER',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Application not found',
  })
  @SwaggerResponse({
    status: 413,
    description: 'File size exceeds 15 MB limit',
  })
  async uploadApplicationDocument(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @NestUploadedFile() file: UploadedFile,
    @Body() uploadDto: UploadDocumentDto,
  ): Promise<DocumentMetadata> {
    if (!file) {
      throw new BadRequestException({
        code: 'ERR_EMPTY_FILE',
        message: 'No file was provided in multipart field "file".',
      });
    }

    return this.documentsService.uploadDocument(
      applicationId,
      currentUser,
      file,
      uploadDto,
    );
  }

  /**
   * Direct upload endpoint with applicationId in body.
   * Path: POST /api/v1/documents/upload
   */
  @Post('documents/upload')
  @Roles(UserRole.INSTITUTION_USER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_SIZE,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a document (direct endpoint)',
    description:
      'Alternative upload endpoint accepting applicationId in the multipart body.',
  })
  @ApiConsumes('multipart/form-data')
  @SwaggerResponse({
    status: 201,
    description: 'Document uploaded and persisted successfully',
    type: DocumentMetadataDto,
  })
  async uploadDocumentDirect(
    @CurrentUser() currentUser: AuthUserPrincipal,
    @NestUploadedFile() file: UploadedFile,
    @Body() uploadDto: UploadDocumentDirectDto,
  ): Promise<DocumentMetadata> {
    if (!file) {
      throw new BadRequestException({
        code: 'ERR_EMPTY_FILE',
        message: 'No file was provided in multipart field "file".',
      });
    }

    return this.documentsService.uploadDocument(
      uploadDto.applicationId,
      currentUser,
      file,
      uploadDto,
    );
  }

  /**
   * Retrieve document metadata by UUID.
   * Path: GET /api/v1/documents/:id
   */
  @Get('documents/:id')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
    UserRole.EVC_INSPECTOR,
  )
  @ApiOperation({
    summary: 'Get document metadata by ID',
    description:
      'Retrieves safe document attachment metadata without leaking internal storage keys or paths.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Document metadata retrieved successfully',
    type: DocumentMetadataDto,
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Document not found',
  })
  async getDocumentMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<DocumentMetadata> {
    return this.documentsService.getDocumentById(id, currentUser);
  }

  /**
   * Stream / download document file with secure headers.
   * Path: GET /api/v1/documents/:id/download
   */
  @Get('documents/:id/download')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
    UserRole.EVC_INSPECTOR,
  )
  @ApiOperation({
    summary: 'Download document binary file',
    description:
      'Streams the document file with Content-Disposition: attachment, verified MIME type, and anti-sniff headers.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Document binary stream',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Document or file not found',
  })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Res() res: Response,
  ): Promise<void> {
    const fileData = await this.documentsService.downloadDocument(
      id,
      currentUser,
    );

    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
      'Content-Length': fileData.fileSizeBytes,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    });

    fileData.stream.pipe(res);
  }

  /**
   * Delete document attachment.
   * Path: DELETE /api/v1/documents/:id
   */
  @Delete('documents/:id')
  @Roles(UserRole.INSTITUTION_USER)
  @ApiOperation({
    summary: 'Delete a document attachment',
    description:
      'Deletes an uploaded document from both database and storage. Restricted to applicant on draft/deficiency applications.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Document deleted successfully',
    type: DocumentDeleteResponseDto,
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot delete: application is locked or submitted',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch or not an INSTITUTION_USER',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Document not found',
  })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<{ success: boolean; id: string }> {
    return this.documentsService.deleteDocument(id, currentUser);
  }
}
