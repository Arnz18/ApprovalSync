/**
 * ApprovalSync — Audit Component Test Suite
 * Milestone: FE-07
 *
 * Covers AuditChainVerificationBadge, AuditHistoryTable,
 * MerkleProofModal, and StandaloneProofVerifierModal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditChainVerificationBadge } from '../components/audit/AuditChainVerificationBadge';
import { AuditHistoryTable } from '../components/audit/AuditHistoryTable';
import { MerkleProofModal } from '../components/audit/MerkleProofModal';
import { StandaloneProofVerifierModal } from '../components/audit/StandaloneProofVerifierModal';
import { auditService } from '../api/services/auditService';
import { AuditLogProjection, AuditVerificationResult, MerkleProofProjection } from '../audit/types';
import { UserRole } from '../api/types';

describe('Audit Components (FE-07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockLogs: AuditLogProjection[] = [
    {
      sequenceNumber: '1',
      applicationId: 'app-uuid-1',
      actorId: 'user-inst-1',
      actorRole: UserRole.INSTITUTION_USER,
      eventType: 'APPLICATION_CREATED',
      payloadSnapshot: { academicYear: '2026-27', instituteType: 'ENGINEERING_COLLEGE' },
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      leafHash: '4a1f89c09930e15b2203cf7d5a570075d691bc13e3a479ff76f183709b1a5e12',
      currentHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
      timestamp: '2026-10-25T08:00:00.000Z',
    },
  ];

  describe('AuditChainVerificationBadge', () => {
    it('executes chain verification and displays valid status', async () => {
      const mockResult: AuditVerificationResult = {
        isChainValid: true,
        applicationId: 'app-uuid-1',
        totalBlocksVerified: 10,
        merkleRootHash: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
        verifiedAt: '2026-10-27T00:00:00.000Z',
      };

      vi.spyOn(auditService, 'verifyChain').mockResolvedValue(mockResult);

      render(<AuditChainVerificationBadge applicationId="app-uuid-1" />);

      // Verify button trigger
      const verifyBtn = screen.getByRole('button', { name: /Verify Sequential Chain/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText('Sequential Chain Intact & Valid')).toBeInTheDocument();
        expect(
          screen.getByText(
            (_, el) => el?.textContent === 'Verified 10 sequential blocks from genesis',
          ),
        ).toBeInTheDocument();
      });
    });

    it('displays warning alert when chain is broken', async () => {
      const mockBrokenResult: AuditVerificationResult = {
        isChainValid: false,
        applicationId: 'app-uuid-1',
        totalBlocksVerified: 10,
        brokenBlockSequence: 4,
        verifiedAt: '2026-10-27T00:00:00.000Z',
      };

      vi.spyOn(auditService, 'verifyChain').mockResolvedValue(mockBrokenResult);

      render(<AuditChainVerificationBadge applicationId="app-uuid-1" />);

      fireEvent.click(screen.getByRole('button', { name: /Verify Sequential Chain/i }));

      await waitFor(() => {
        expect(screen.getByText(/Chain Broken at Sequence #4/i)).toBeInTheDocument();
      });
    });
  });

  describe('AuditHistoryTable', () => {
    it('renders audit events, sequence numbers, and triggers proof opening', () => {
      const onOpenProof = vi.fn();

      render(
        <AuditHistoryTable logs={mockLogs} applicationId="app-uuid-1" onOpenProof={onOpenProof} />,
      );

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('Application Draft Created')).toBeInTheDocument();
      expect(screen.getByText(/Institution Representative/i)).toBeInTheDocument();

      // Open proof
      fireEvent.click(screen.getByRole('button', { name: /Proof/i }));
      expect(onOpenProof).toHaveBeenCalledWith('1');
    });

    it('toggles canonical payload JSON expander', () => {
      render(
        <AuditHistoryTable logs={mockLogs} applicationId="app-uuid-1" onOpenProof={vi.fn()} />,
      );

      // Click Payload button
      const payloadBtn = screen.getByRole('button', { name: /Payload/i });
      fireEvent.click(payloadBtn);

      expect(screen.getByText(/ENGINEERING_COLLEGE/i)).toBeInTheDocument();

      // Click again to collapse
      fireEvent.click(payloadBtn);
      expect(screen.queryByText(/ENGINEERING_COLLEGE/i)).not.toBeInTheDocument();
    });
  });

  describe('MerkleProofModal', () => {
    it('fetches Merkle inclusion proof and renders path nodes', async () => {
      const mockProof: MerkleProofProjection = {
        applicationId: 'app-uuid-1',
        sequenceNumber: '1',
        leafIndex: 0,
        totalLeaves: 2,
        leafHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
        expectedRoot: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
        proofPath: [
          {
            position: 'right',
            hash: '6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
          },
        ],
      };

      vi.spyOn(auditService, 'getMerkleProof').mockResolvedValue(mockProof);

      render(
        <MerkleProofModal
          applicationId="app-uuid-1"
          sequenceNumber="1"
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('RFC 6962 Merkle Inclusion Proof')).toBeInTheDocument();
        expect(screen.getByText(/2 blocks/i)).toBeInTheDocument();
        expect(screen.getByText('RIGHT')).toBeInTheDocument();
      });
    });

    it('triggers upward mathematical verification from proof modal', async () => {
      const mockProof: MerkleProofProjection = {
        applicationId: 'app-uuid-1',
        sequenceNumber: '1',
        leafIndex: 0,
        totalLeaves: 2,
        leafHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
        expectedRoot: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
        proofPath: [
          {
            position: 'right',
            hash: '6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
          },
        ],
      };

      vi.spyOn(auditService, 'getMerkleProof').mockResolvedValue(mockProof);
      const verifyProofSpy = vi.spyOn(auditService, 'verifyStandaloneProof').mockResolvedValue({
        isValid: true,
        leafHash: mockProof.leafHash,
        expectedRoot: mockProof.expectedRoot,
      });

      render(
        <MerkleProofModal
          applicationId="app-uuid-1"
          sequenceNumber="1"
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Verify Proof Math Standalone/i }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Verify Proof Math Standalone/i }));

      await waitFor(() => {
        expect(verifyProofSpy).toHaveBeenCalled();
        expect(screen.getByText('Cryptographic Inclusion Verified')).toBeInTheDocument();
      });
    });
  });

  describe('StandaloneProofVerifierModal', () => {
    it('validates 64-character hex inputs and executes standalone verification', async () => {
      const verifyProofSpy = vi.spyOn(auditService, 'verifyStandaloneProof').mockResolvedValue({
        isValid: true,
        leafHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
        expectedRoot: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
      });

      render(<StandaloneProofVerifierModal isOpen={true} onClose={vi.fn()} />);

      expect(
        screen.getByText('Standalone RFC 6962 Merkle Proof Mathematical Verifier'),
      ).toBeInTheDocument();

      // Enter leaf hash and expected root
      const leafInput = screen.getByPlaceholderText(
        /e.g. 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945/i,
      );
      const rootInput = screen.getByPlaceholderText(
        /e.g. 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b/i,
      );

      fireEvent.change(leafInput, {
        target: { value: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2' },
      });
      fireEvent.change(rootInput, {
        target: { value: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1' },
      });

      // Enter proof step hash
      const stepHashInput = screen.getByPlaceholderText(/64-char sibling SHA-256 hash/i);
      fireEvent.change(stepHashInput, {
        target: { value: '6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Compute Proof Math/i }));

      await waitFor(() => {
        expect(verifyProofSpy).toHaveBeenCalled();
        expect(screen.getByText('Mathematical Verification Corroborated')).toBeInTheDocument();
      });
    });
  });
});
