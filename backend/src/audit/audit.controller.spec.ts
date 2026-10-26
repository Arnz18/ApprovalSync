/**
 * ApprovalSync — Audit Controller Unit Tests
 * Milestone: BE-07
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: jest.Mocked<AuditService>;

  const appId = 'b0000000-0000-0000-0000-000000000001';
  const mockUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'auditor@synthetic.approvalsync.local',
    name: 'Auditor User',
    role: UserRole.AUDITOR,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: {
            getAuditLogsForApplication: jest.fn(),
            verifyApplicationChain: jest.fn(),
            getLatestCheckpoint: jest.fn(),
            getMerkleProof: jest.fn(),
            verifyStandaloneProof: jest.fn(),
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

    controller = module.get<AuditController>(AuditController);
    auditService = module.get(AuditService);
  });

  it('delegates getAuditLogs to auditService.getAuditLogsForApplication', async () => {
    const mockResult = {
      items: [],
      pagination: {
        totalItems: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    auditService.getAuditLogsForApplication.mockResolvedValueOnce(
      mockResult as any,
    );

    const res = await controller.getAuditLogs(appId, mockUser, {
      page: 1,
      limit: 10,
    });
    expect(res).toEqual(mockResult);
    expect(auditService.getAuditLogsForApplication).toHaveBeenCalledWith(
      appId,
      mockUser,
      { page: 1, limit: 10 },
    );
  });

  it('delegates verifyChain to auditService.verifyApplicationChain', async () => {
    const mockVerification = {
      applicationId: appId,
      isChainValid: true,
      totalBlocksVerified: 3,
      verifiedAt: '2026-10-26T12:00:00.000Z',
      merkleRootHash: 'abc',
    };
    auditService.verifyApplicationChain.mockResolvedValueOnce(mockVerification);

    const res = await controller.verifyChain(appId, mockUser);
    expect(res).toEqual(mockVerification);
    expect(auditService.verifyApplicationChain).toHaveBeenCalledWith(
      appId,
      mockUser,
    );
  });

  it('delegates getCheckpoint to auditService.getLatestCheckpoint', async () => {
    const mockCheckpoint = {
      id: 'cp-1',
      applicationId: appId,
      sequenceNumber: '3',
      chainHeadHash: 'h1',
      merkleRootHash: 'r1',
      totalBlocks: 3,
      algorithm: 'RFC6962_SHA256',
      createdAt: new Date(),
      application: {} as any,
    };
    auditService.getLatestCheckpoint.mockResolvedValueOnce(mockCheckpoint);

    const res = await controller.getCheckpoint(appId, mockUser);
    expect(res).toEqual(mockCheckpoint);
    expect(auditService.getLatestCheckpoint).toHaveBeenCalledWith(
      appId,
      mockUser,
    );
  });

  it('delegates getProof to auditService.getMerkleProof', async () => {
    const mockProof = {
      applicationId: appId,
      sequenceNumber: '2',
      leafIndex: 1,
      totalLeaves: 3,
      leafHash: 'l1',
      proofPath: [],
      expectedRoot: 'r1',
    };
    auditService.getMerkleProof.mockResolvedValueOnce(mockProof);

    const res = await controller.getProof(appId, '2', mockUser);
    expect(res).toEqual(mockProof);
    expect(auditService.getMerkleProof).toHaveBeenCalledWith(
      appId,
      '2',
      mockUser,
    );
  });

  it('delegates verifyStandaloneProof to auditService.verifyStandaloneProof', async () => {
    const dto = {
      leafHash: 'a'.repeat(64),
      expectedRoot: 'b'.repeat(64),
      proofPath: [],
    };
    const mockResult = {
      isValid: true,
      leafHash: dto.leafHash,
      expectedRoot: dto.expectedRoot,
    };
    auditService.verifyStandaloneProof.mockReturnValueOnce(mockResult);

    const res = await controller.verifyStandaloneProof(dto);
    expect(res).toEqual(mockResult);
    expect(auditService.verifyStandaloneProof).toHaveBeenCalledWith(dto);
  });
});
