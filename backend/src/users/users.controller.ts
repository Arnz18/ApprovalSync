/**
 * ApprovalSync — Users Controller
 * Protected user endpoints with RBAC and institutional tenant scoping.
 * Milestone: BE-03
 */

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUserPrincipal,
  AuthUserProjection,
} from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({
    summary: 'Get user profile by ID',
    description:
      'Retrieves safe user profile. Enforces institutional tenancy: INSTITUTION_USER cannot access users outside their institution.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target user UUID',
  })
  @SwaggerResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing, invalid, or expired authentication token',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Access denied: insufficient privileges or tenancy mismatch',
  })
  @SwaggerResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<AuthUserProjection> {
    const targetUser = await this.usersService.findById(id);

    // Tenant isolation: INSTITUTION_USER can only view their own record or members of their institution.
    // Nonexistent target users or users from another institution uniformly return 403 Forbidden to prevent enumeration.
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        currentUser.id !== id &&
        (!targetUser ||
          !currentUser.institutionId ||
          currentUser.institutionId !== targetUser.institutionId)
      ) {
        throw new ForbiddenException(
          'Access denied: cannot access user from another institution.',
        );
      }
    }

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    return this.usersService.toSafeProjection(targetUser);
  }
}
