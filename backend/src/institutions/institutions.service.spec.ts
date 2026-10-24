/**
 * ApprovalSync — Institutions Service Unit Tests
 * Milestone: BE-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { Institution } from '../database/entities/institution.entity';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let repo: jest.Mocked<Repository<Institution>>;

  const mockInstitution: Institution = {
    id: 'a0000000-0000-0000-0000-000000000001',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: getRepositoryToken(Institution),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
    repo = module.get(getRepositoryToken(Institution));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('returns institution when found', async () => {
      repo.findOne.mockResolvedValue(mockInstitution);

      const result = await service.findById(mockInstitution.id);
      expect(result).toEqual(mockInstitution);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockInstitution.id },
      });
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('returns institution profile projection when found', async () => {
      repo.findOne.mockResolvedValue(mockInstitution);

      const result = await service.getProfile(mockInstitution.id);
      expect(result).toEqual(mockInstitution);
    });

    it('throws NotFoundException when institution does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('updates editable fields without altering server-managed fields', async () => {
      const cloned = { ...mockInstitution };
      repo.findOne.mockResolvedValue(cloned);
      repo.save.mockImplementation(async (entity) => entity as Institution);

      const result = await service.updateProfile(mockInstitution.id, {
        address: 'New Campus Road, Block B',
        district: 'Pune Urban',
        pincode: '411002',
      });

      expect(result.address).toBe('New Campus Road, Block B');
      expect(result.district).toBe('Pune Urban');
      expect(result.pincode).toBe('411002');
      expect(result.id).toBe(mockInstitution.id);
      expect(result.registrationNumber).toBe(
        mockInstitution.registrationNumber,
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException if institution does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('missing-id', { address: '123' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toProfileProjection', () => {
    it('returns an explicit projection with formatted ISO dates', () => {
      const projection = service.toProfileProjection(mockInstitution);
      expect(projection).toEqual({
        id: mockInstitution.id,
        name: mockInstitution.name,
        registrationNumber: mockInstitution.registrationNumber,
        institutionType: mockInstitution.institutionType,
        state: mockInstitution.state,
        district: mockInstitution.district,
        pincode: mockInstitution.pincode,
        address: mockInstitution.address,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      });
    });
  });
});
