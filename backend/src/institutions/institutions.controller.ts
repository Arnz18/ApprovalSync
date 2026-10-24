/**
 * ApprovalSync — Institutions Controller
 * Authenticated endpoints for institution profile retrieval and controlled updates.
 * Milestone: BE-04
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionProfileProjection } from './dto/institution-response.dto';

@ApiTags('Institutions')
@ApiBearerAuth('JWT')
@Controller('institutions')
@UseGuards(JwtAuthGuard)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get('my-profile')
  @Roles(UserRole.INSTITUTION_USER)
  @ApiOperation({
    summary: 'Get current user institution profile',
    description:
      'Retrieves profile of the institution linked to the authenticated user principal.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Institution profile retrieved successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Current user is not associated with an institution',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Forbidden: caller lacks INSTITUTION_USER role',
  })
  async getMyProfile(
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<InstitutionProfileProjection> {
    if (!currentUser.institutionId) {
      throw new BadRequestException(
        'User is not associated with an institution.',
      );
    }
    const institution = await this.institutionsService.getProfile(
      currentUser.institutionId,
    );
    return this.institutionsService.toProfileProjection(institution);
  }

  @Patch('my-profile')
  @Roles(UserRole.INSTITUTION_USER)
  @ApiOperation({
    summary: 'Update current user institution profile',
    description:
      'Updates editable profile fields of the institution linked to the authenticated user principal.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Institution profile updated successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Invalid input or user not associated with an institution',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Forbidden: caller lacks INSTITUTION_USER role',
  })
  async updateMyProfile(
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() updateDto: UpdateInstitutionDto,
  ): Promise<InstitutionProfileProjection> {
    if (!currentUser.institutionId) {
      throw new BadRequestException(
        'User is not associated with an institution.',
      );
    }
    const updated = await this.institutionsService.updateProfile(
      currentUser.institutionId,
      updateDto,
    );
    return this.institutionsService.toProfileProjection(updated);
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
    summary: 'Get institution profile by ID',
    description:
      'Retrieves institution profile. Enforces institutional tenancy: INSTITUTION_USER cannot access profiles outside their institution.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target institution UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Institution profile retrieved successfully',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description:
      'Access denied: caller lacks required role or tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Institution not found',
  })
  async getInstitutionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<InstitutionProfileProjection> {
    // Tenant isolation: INSTITUTION_USER can only view their own institution.
    // Querying an external or nonexistent institution UUID uniformly returns 403 to prevent enumeration.
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (!currentUser.institutionId || currentUser.institutionId !== id) {
        throw new ForbiddenException(
          'Access denied: cannot access profile of another institution.',
        );
      }
    }

    const institution = await this.institutionsService.getProfile(id);
    return this.institutionsService.toProfileProjection(institution);
  }

  @Patch(':id')
  @Roles(UserRole.INSTITUTION_USER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Update institution profile by ID',
    description:
      'Updates editable institution fields. INSTITUTION_USER can only update their own institution. Regulatory review roles are denied.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target institution UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Institution profile updated successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Validation failed',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description:
      'Access denied: insufficient update privileges or tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Institution not found',
  })
  async updateInstitutionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() updateDto: UpdateInstitutionDto,
  ): Promise<InstitutionProfileProjection> {
    // Tenant isolation: INSTITUTION_USER can only update their own institution.
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (!currentUser.institutionId || currentUser.institutionId !== id) {
        throw new ForbiddenException(
          'Access denied: cannot update profile of another institution.',
        );
      }
    }

    const updated = await this.institutionsService.updateProfile(id, updateDto);
    return this.institutionsService.toProfileProjection(updated);
  }
}
