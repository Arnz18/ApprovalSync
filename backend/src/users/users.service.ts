/**
 * ApprovalSync — Users Service
 * User lookup, creation, and safe projection logic.
 * Milestone: BE-03
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { AuthUserProjection } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  institutionId?: string | null;
  regionalOffice?: string | null;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Find user by email specifically for authentication verification.
   * Explicitly includes the hidden passwordHash column.
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  /**
   * Safe lookup by user ID without passwordHash.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  /**
   * Return safe user projection suitable for public/client serialized responses.
   */
  async findSafeUserById(id: string): Promise<AuthUserProjection | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }
    return this.toSafeProjection(user);
  }

  /**
   * Create a user with securely hashed password (bcrypt).
   */
  async createUser(data: CreateUserData): Promise<AuthUserProjection> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = this.userRepository.create({
      name: data.name,
      email: data.email.trim().toLowerCase(),
      role: data.role,
      passwordHash,
      institutionId: data.institutionId || null,
      regionalOffice: data.regionalOffice || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    const saved = await this.userRepository.save(user);
    return this.toSafeProjection(saved);
  }

  /**
   * Maps User entity to safe projection (guarantees passwordHash is excluded).
   */
  toSafeProjection(user: User): AuthUserProjection {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId || null,
      regionalOffice: user.regionalOffice || null,
      isActive: user.isActive,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : String(user.createdAt),
      updatedAt:
        user.updatedAt instanceof Date
          ? user.updatedAt.toISOString()
          : String(user.updatedAt),
    };
  }
}
