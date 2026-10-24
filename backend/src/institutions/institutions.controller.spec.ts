/**
 * ApprovalSync — Institutions Controller Unit Tests
 * Milestone: BE-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { Institution } from '../database/entities/institution.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

describe('InstitutionsController', () => {
  let controller: InstitutionsController;
  let service: jest.Mocked<InstitutionsService>;

  const instId1 = 'a0000000-0000-0000-0000-000000000001';
  const instId2 = 'a0000000-0000-0000-0000-000000000002';

  const mockInstitution1: Institution = {
    id: instId1,
    name: 'Apex Institute of Technology & Engineering',
    registrationNumber: 'DEMO-INST-2026-001',
    institutionType: 'Engineering & Technology',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411001',
    address: 'Plot 42, Knowledge Park, Pune',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    users: [],
    applications: [],
  };

  const institutionUserPrincipal: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'inst.rep@synthetic.local',
    name: 'College Rep',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId1,
  };

  const scrutinyOfficerPrincipal: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000002',
    email: 'officer@synthetic.local',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
    regionalOffice: 'Western Regional Office',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionsController],
      providers: [
        {
          provide: InstitutionsService,
          useValue: {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            toProfileProjection: jest.fn((inst: Institution) => ({
              id: inst.id,
              name: inst.name,
              registrationNumber: inst.registrationNumber,
              institutionType: inst.institutionType,
              state: inst.state,
              district: inst.district,
              pincode: inst.pincode,
              address: inst.address,
              createdAt: inst.createdAt.toISOString(),
              updatedAt: inst.updatedAt.toISOString(),
            })),
          },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<InstitutionsController>(InstitutionsController);
    service = module.get(InstitutionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('returns own institution profile for authenticated institution user', async () => {
      service.getProfile.mockResolvedValue(mockInstitution1);

      const result = await controller.getMyProfile(institutionUserPrincipal);
      expect(result.id).toBe(instId1);
      expect(service.getProfile).toHaveBeenCalledWith(instId1);
    });

    it('throws BadRequestException if user has no institutionId', async () => {
      const userWithoutInst: AuthUserPrincipal = {
        ...institutionUserPrincipal,
        institutionId: null,
      };

      await expect(controller.getMyProfile(userWithoutInst)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateMyProfile', () => {
    it('updates own profile for authenticated institution user', async () => {
      const updatedInst = {
        ...mockInstitution1,
        address: 'Updated Campus Address',
      };
      service.updateProfile.mockResolvedValue(updatedInst);

      const result = await controller.updateMyProfile(
        institutionUserPrincipal,
        {
          address: 'Updated Campus Address',
        },
      );

      expect(result.address).toBe('Updated Campus Address');
      expect(service.updateProfile).toHaveBeenCalledWith(instId1, {
        address: 'Updated Campus Address',
      });
    });
  });

  describe('getInstitutionById', () => {
    it('allows institution user to view own institution by ID', async () => {
      service.getProfile.mockResolvedValue(mockInstitution1);

      const result = await controller.getInstitutionById(
        instId1,
        institutionUserPrincipal,
      );
      expect(result.id).toBe(instId1);
    });

    it('rejects institution user attempting to view another institution by ID with 403 Forbidden', async () => {
      await expect(
        controller.getInstitutionById(instId2, institutionUserPrincipal),
      ).rejects.toThrow(ForbiddenException);

      expect(service.getProfile).not.toHaveBeenCalled();
    });

    it('allows scrutiny officer to view any institution by ID', async () => {
      service.getProfile.mockResolvedValue(mockInstitution1);

      const result = await controller.getInstitutionById(
        instId1,
        scrutinyOfficerPrincipal,
      );
      expect(result.id).toBe(instId1);
      expect(service.getProfile).toHaveBeenCalledWith(instId1);
    });

    it('propagates NotFoundException if institution not found for officer', async () => {
      service.getProfile.mockRejectedValue(new NotFoundException());

      await expect(
        controller.getInstitutionById(instId1, scrutinyOfficerPrincipal),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInstitutionById', () => {
    it('allows institution user to update own institution by ID', async () => {
      const updated = { ...mockInstitution1, pincode: '411005' };
      service.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateInstitutionById(
        instId1,
        institutionUserPrincipal,
        { pincode: '411005' },
      );
      expect(result.pincode).toBe('411005');
    });

    it('rejects institution user attempting to update another institution by ID with 403 Forbidden', async () => {
      await expect(
        controller.updateInstitutionById(instId2, institutionUserPrincipal, {
          pincode: '411005',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(service.updateProfile).not.toHaveBeenCalled();
    });
  });
});
