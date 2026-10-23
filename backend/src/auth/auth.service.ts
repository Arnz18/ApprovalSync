/**
 * ApprovalSync — Authentication Service
 * Credential verification, JWT issuance, and session resolution.
 * Milestone: BE-03
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthUserProjection } from './interfaces/auth-user.interface';

// Precomputed synthetic bcrypt hash (cost factor 10) to maintain constant-time response for nonexistent/inactive users
const DUMMY_BCRYPT_HASH =
  '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user credentials and issue signed JWT access token.
   * Uniformly rejects nonexistent, disabled, or incorrect credentials
   * to prevent account enumeration / timing discrepancies.
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmailForAuth(normalizedEmail);

    // Uniform rejection logic: never disclose account existence, disabled status, or password correctness.
    // Perform asynchronous dummy bcrypt comparison so nonexistent/inactive accounts take the same time.
    if (!user || !user.isActive || !user.passwordHash) {
      await bcrypt.compare(loginDto.password, DUMMY_BCRYPT_HASH);
      this.logger.debug(
        `Login attempt rejected for email: ${normalizedEmail} (account missing, inactive, or unconfigured)`,
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.debug(
        `Login attempt rejected for email: ${normalizedEmail} (password mismatch)`,
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId || null,
      regionalOffice: user.regionalOffice || null,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = this.getExpiresInSeconds();

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.usersService.toSafeProjection(user),
    };
  }

  /**
   * Get safe projection for current authenticated user.
   */
  async getMe(userId: string): Promise<AuthUserProjection> {
    const user = await this.usersService.findSafeUserById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'User account no longer active or found.',
      );
    }
    return user;
  }

  /**
   * Parse configured expiresIn string (e.g. '3600s', '1h') to numeric seconds.
   */
  private getExpiresInSeconds(): number {
    const configured = this.configService.get<string>('jwt.expiresIn', '3600s');
    if (typeof configured === 'number') {
      return configured;
    }
    const match = String(configured).match(/^(\d+)([smhd])?$/);
    if (!match) {
      return 3600;
    }
    const val = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'm':
        return val * 60;
      case 'h':
        return val * 3600;
      case 'd':
        return val * 86400;
      case 's':
      default:
        return val;
    }
  }
}
