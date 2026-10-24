/**
 * ApprovalSync — Applications Controller
 * Application intake, draft modification, submission, and document attachment metadata endpoints.
 * Milestone: BE-04
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole, PaginationMeta } from '../shared/contracts';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import {
  ApplicationProjection,
  DocumentMetadataProjection,
} from './dto/application-response.dto';

@ApiTags('Applications')
@ApiBearerAuth('JWT')
@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(UserRole.INSTITUTION_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new draft application',
    description:
      'Creates a new application in DRAFT status bound to the authenticated user institution.',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Draft application created successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Validation failed or caller has no assigned institution',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Forbidden: caller lacks INSTITUTION_USER role',
  })
  async createApplication(
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() createDto: CreateApplicationDto,
  ): Promise<ApplicationProjection> {
    if (!currentUser.institutionId) {
      throw new BadRequestException(
        'User is not associated with an institution.',
      );
    }
    const application = await this.applicationsService.createApplication(
      currentUser.institutionId,
      createDto,
    );
    return this.applicationsService.toProjection(application);
  }

  @Get()
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
    summary: 'List applications with pagination and filters',
    description:
      'Retrieves paginated applications. INSTITUTION_USER is strictly scoped to their own institution. Regulatory roles can view across institutions.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated list of applications retrieved successfully',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Forbidden: caller lacks required role',
  })
  async getApplications(
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Query() queryDto: ApplicationQueryDto,
  ): Promise<{ items: ApplicationProjection[]; pagination: PaginationMeta }> {
    const { items, pagination } =
      await this.applicationsService.getApplications(currentUser, queryDto);
    return {
      items: items.map((app) => this.applicationsService.toProjection(app)),
      pagination,
    };
  }

  @Get(':id')
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
    summary: 'Get application details by ID',
    description:
      'Retrieves application details. Enforces institutional tenancy: INSTITUTION_USER cannot access applications belonging to other institutions.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Application details retrieved successfully',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: insufficient privileges or tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Application not found',
  })
  async getApplicationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<ApplicationProjection> {
    const application =
      await this.applicationsService.getApplicationByIdForUser(id, currentUser);
    return this.applicationsService.toProjection(application);
  }

  @Patch(':id')
  @Roles(UserRole.INSTITUTION_USER)
  @ApiOperation({
    summary: 'Update an editable draft application',
    description:
      'Partially updates an application. Only permitted for applications in DRAFT status belonging to the caller institution.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Application updated successfully',
  })
  @SwaggerResponse({
    status: 400,
    description:
      'Cannot update: application is not in DRAFT status or validation failed',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch or not an INSTITUTION_USER',
  })
  async updateApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() updateDto: UpdateApplicationDto,
  ): Promise<ApplicationProjection> {
    const updated = await this.applicationsService.updateDraftApplication(
      id,
      currentUser,
      updateDto,
    );
    return this.applicationsService.toProjection(updated);
  }

  @Post(':id/submit')
  @Roles(UserRole.INSTITUTION_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a draft application for scrutiny review',
    description:
      'Transitions an application from DRAFT to SUBMITTED and sets submittedAt within an atomic database transaction.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID to submit',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Application submitted successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot submit: application is not in DRAFT status',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch or not an INSTITUTION_USER',
  })
  async submitApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<ApplicationProjection> {
    const submitted = await this.applicationsService.submitDraftApplication(
      id,
      currentUser,
    );
    return this.applicationsService.toProjection(submitted);
  }

  @Get(':id/documents')
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
    summary: 'List document attachment metadata for an application',
    description:
      'Retrieves existing document metadata linked to the application. Enforces institutional tenancy.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Document metadata list retrieved successfully',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: insufficient privileges or tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Application not found',
  })
  async getApplicationDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<DocumentMetadataProjection[]> {
    return this.applicationsService.getApplicationDocuments(id, currentUser);
  }
}
