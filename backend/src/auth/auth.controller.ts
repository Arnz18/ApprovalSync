/**
 * ApprovalSync — Authentication Controller
 * Login and Current-User session endpoints.
 * Milestone: BE-03
 */

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  AuthUserPrincipal,
  AuthUserProjection,
} from './interfaces/auth-user.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user credentials',
    description:
      'Validates email and password, returning a signed JWT access token and user profile projection.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Authentication successful',
    type: LoginResponseDto,
  })
  @SwaggerResponse({
    status: 400,
    description: 'Malformed or invalid input parameters',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Invalid credentials or inactive account',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Returns the safe user profile projection for the caller derived from the verified JWT access token.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Current user profile retrieved successfully',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Missing, invalid, or expired authentication token',
  })
  async getMe(
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<AuthUserProjection> {
    return this.authService.getMe(currentUser.id);
  }
}
