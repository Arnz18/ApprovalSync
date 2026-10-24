/**
 * ApprovalSync — Institutions Service
 * Persistence operations and profile projections for institutions.
 * Milestone: BE-04
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../database/entities/institution.entity';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionProfileProjection } from './dto/institution-response.dto';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
  ) {}

  /**
   * Find an institution by UUID without throwing.
   */
  async findById(id: string): Promise<Institution | null> {
    return this.institutionRepository.findOne({
      where: { id },
    });
  }

  /**
   * Retrieve institution profile by ID, throwing NotFoundException if not present.
   */
  async getProfile(id: string): Promise<Institution> {
    const institution = await this.findById(id);
    if (!institution) {
      throw new NotFoundException('Institution not found.');
    }
    return institution;
  }

  /**
   * Controlled update of editable institution profile fields.
   * Server-managed fields (id, registrationNumber, createdAt, updatedAt) are never modified.
   */
  async updateProfile(
    id: string,
    updateDto: UpdateInstitutionDto,
  ): Promise<Institution> {
    const institution = await this.getProfile(id);

    if (updateDto.name !== undefined) {
      institution.name = updateDto.name.trim();
    }
    if (updateDto.institutionType !== undefined) {
      institution.institutionType = updateDto.institutionType.trim();
    }
    if (updateDto.state !== undefined) {
      institution.state = updateDto.state.trim();
    }
    if (updateDto.district !== undefined) {
      institution.district = updateDto.district.trim();
    }
    if (updateDto.pincode !== undefined) {
      institution.pincode = updateDto.pincode.trim();
    }
    if (updateDto.address !== undefined) {
      institution.address = updateDto.address.trim();
    }

    return this.institutionRepository.save(institution);
  }

  /**
   * Converts an Institution entity to a safe, explicit profile projection.
   */
  toProfileProjection(institution: Institution): InstitutionProfileProjection {
    return {
      id: institution.id,
      name: institution.name,
      registrationNumber: institution.registrationNumber,
      institutionType: institution.institutionType,
      state: institution.state,
      district: institution.district,
      pincode: institution.pincode,
      address: institution.address,
      createdAt:
        institution.createdAt instanceof Date
          ? institution.createdAt.toISOString()
          : String(institution.createdAt),
      updatedAt:
        institution.updatedAt instanceof Date
          ? institution.updatedAt.toISOString()
          : String(institution.updatedAt),
    };
  }
}
