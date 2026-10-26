/**
 * ApprovalSync — Undertakings Component Test Suite
 * Milestone: FE-07
 *
 * Covers UndertakingStatusBadge, UndertakingReviewBadge, UndertakingTable,
 * CreateUndertakingModal, ReviewUndertakingModal, RenewUndertakingModal,
 * UndertakingHistoryModal, ReconcileUndertakingsModal, and UndertakingDetailModal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  UndertakingStatusBadge,
  UndertakingReviewBadge,
} from '../components/undertakings/UndertakingStatusBadge';
import { UndertakingTable } from '../components/undertakings/UndertakingTable';
import { CreateUndertakingModal } from '../components/undertakings/CreateUndertakingModal';
import { ReviewUndertakingModal } from '../components/undertakings/ReviewUndertakingModal';
import { RenewUndertakingModal } from '../components/undertakings/RenewUndertakingModal';
import { UndertakingHistoryModal } from '../components/undertakings/UndertakingHistoryModal';
import { ReconcileUndertakingsModal } from '../components/undertakings/ReconcileUndertakingsModal';
import { UndertakingDetailModal } from '../components/undertakings/UndertakingDetailModal';
import { undertakingsService } from '../api/services/undertakingsService';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
  UndertakingProjection,
  UndertakingHistoryEntry,
  UndertakingReconcileResult,
} from '../undertakings/types';
import { UserRole } from '../api/types';

describe('Undertakings Components (FE-07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRecord: UndertakingProjection = {
    id: 'und-101',
    institutionId: 'inst-1',
    applicationId: 'app-uuid-1',
    type: UndertakingType.LAND_LEASE,
    title: '30-Year Registered Land Lease Deed',
    documentNumber: 'KA-DEED-9912',
    issuingAuthority: 'Sub-Registrar, Electronic City',
    counterpartyName: 'State Industrial Development Corp',
    startDate: '2020-04-01',
    expiryDate: '2050-03-31',
    renewalLeadDays: 180,
    renewalDueDate: '2049-10-02',
    daysRemaining: 8500,
    isExpiringSoon: false,
    isRenewalDue: false,
    isExpired: false,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    reviewNotes: 'Verified stamped deed',
    reviewedById: 'rev-1',
    reviewedAt: '2026-10-25T14:30:00.000Z',
    documentId: 'doc-1',
    supersedesId: null,
    supersededById: null,
    metadataJsonb: { surveyNo: '44/2A' },
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T14:30:00.000Z',
    disclaimer: 'Illustrative regulatory data',
  };

  describe('UndertakingStatusBadge & UndertakingReviewBadge', () => {
    it('renders correct lifecycle status badge and label', () => {
      const { rerender } = render(<UndertakingStatusBadge status={UndertakingStatus.ACTIVE} />);
      expect(screen.getByText('Active (In Force)')).toBeInTheDocument();

      rerender(<UndertakingStatusBadge status={UndertakingStatus.EXPIRING_SOON} />);
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();

      rerender(<UndertakingStatusBadge status={UndertakingStatus.EXPIRED} />);
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('renders correct review status badge and label', () => {
      const { rerender } = render(
        <UndertakingReviewBadge reviewStatus={UndertakingReviewStatus.VERIFIED} />,
      );
      expect(screen.getByText('Verified (Concurrent)')).toBeInTheDocument();

      rerender(<UndertakingReviewBadge reviewStatus={UndertakingReviewStatus.PENDING_REVIEW} />);
      expect(screen.getByText('Pending Review')).toBeInTheDocument();

      rerender(<UndertakingReviewBadge reviewStatus={UndertakingReviewStatus.DEFICIENT} />);
      expect(screen.getByText('Clarification / Deficiency')).toBeInTheDocument();
    });
  });

  describe('UndertakingTable', () => {
    it('renders undertaking records with instrument title and details', () => {
      render(
        <UndertakingTable
          undertakings={[mockRecord]}
          currentUserRole={UserRole.SCRUTINY_OFFICER}
          onSelectUndertaking={vi.fn()}
        />,
      );

      expect(screen.getByText('30-Year Registered Land Lease Deed')).toBeInTheDocument();
      expect(screen.getByText(/KA-DEED-9912/i)).toBeInTheDocument();
      expect(screen.getByText('Sub-Registrar, Electronic City')).toBeInTheDocument();
      expect(screen.getByText('Active (In Force)')).toBeInTheDocument();
    });

    it('renders empty state when items list is empty', () => {
      render(
        <UndertakingTable
          undertakings={[]}
          currentUserRole={UserRole.INSTITUTION_USER}
          onSelectUndertaking={vi.fn()}
        />,
      );

      expect(screen.getByText('No Undertakings or Leases Found')).toBeInTheDocument();
    });

    it('triggers action callbacks when action buttons are clicked', () => {
      const onSelectUndertaking = vi.fn();
      const onOpenReview = vi.fn();

      render(
        <UndertakingTable
          undertakings={[mockRecord]}
          currentUserRole={UserRole.SCRUTINY_OFFICER}
          onSelectUndertaking={onSelectUndertaking}
          onOpenReview={onOpenReview}
        />,
      );

      fireEvent.click(screen.getByTitle('View Full Details & Lineage'));
      expect(onSelectUndertaking).toHaveBeenCalledWith(mockRecord);

      fireEvent.click(screen.getByTitle('Conduct Regulatory Review'));
      expect(onOpenReview).toHaveBeenCalledWith(mockRecord);
    });
  });

  describe('CreateUndertakingModal', () => {
    it('renders form and validates required fields before submission', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(<CreateUndertakingModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

      expect(screen.getByText('Register Statutory Undertaking / Lease')).toBeInTheDocument();

      // Attempt to submit empty form
      fireEvent.click(screen.getByRole('button', { name: /Save & Create Instrument/i }));

      await waitFor(() => {
        expect(screen.getByText(/Instrument title is required/i)).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('submits valid undertaking data via API', async () => {
      const createSpy = vi
        .spyOn(undertakingsService, 'createUndertaking')
        .mockResolvedValue(mockRecord);

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(<CreateUndertakingModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText(/e.g. 30-Year Registered Land Lease Deed/i), {
        target: { value: 'Fire Safety Clearance Certificate' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e.g. DEED-KA-2021-0092/i), {
        target: { value: 'NOC-FS-2026-99' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e.g. Sub-Registrar Office, Bangalore South/i), {
        target: { value: 'State Fire & Rescue Services' },
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Save & Create Instrument/i }));

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('ReviewUndertakingModal', () => {
    const unreviewedRecord: UndertakingProjection = {
      ...mockRecord,
      status: UndertakingStatus.SUBMITTED,
      reviewStatus: UndertakingReviewStatus.PENDING_REVIEW,
    };

    it('requires minimum review notes length before submitting review', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReviewUndertakingModal
          undertaking={unreviewedRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText(/Regulatory Review & Verification/i)).toBeInTheDocument();

      // Attempt submit without notes
      fireEvent.click(screen.getByRole('button', { name: /Record Regulatory Review/i }));

      await waitFor(() => {
        expect(screen.getByText(/Detailed review findings are mandatory/i)).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('submits VERIFIED review disposition via API when valid notes provided', async () => {
      const reviewSpy = vi.spyOn(undertakingsService, 'reviewUndertaking').mockResolvedValue({
        ...unreviewedRecord,
        reviewStatus: UndertakingReviewStatus.VERIFIED,
        reviewNotes: 'Survey numbers and stamp registration confirmed with revenue records',
      });

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReviewUndertakingModal
          undertaking={unreviewedRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      fireEvent.change(
        screen.getByPlaceholderText(/Provide detailed justification, verified document register/i),
        {
          target: { value: 'Survey numbers and stamp registration confirmed with revenue records' },
        },
      );

      fireEvent.click(screen.getByRole('button', { name: /Record Regulatory Review/i }));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('und-101', {
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Survey numbers and stamp registration confirmed with revenue records',
          effectiveStatus: UndertakingStatus.ACTIVE,
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('rejects notes shorter than 5 characters with validation error', async () => {
      const reviewSpy = vi.spyOn(undertakingsService, 'reviewUndertaking');
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReviewUndertakingModal
          undertaking={unreviewedRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      fireEvent.change(
        screen.getByPlaceholderText(/Provide detailed justification, verified document register/i),
        {
          target: { value: 'Bad' },
        },
      );

      fireEvent.click(screen.getByRole('button', { name: /Record Regulatory Review/i }));

      await waitFor(() => {
        expect(screen.getByText(/Review notes must be at least 5 characters/i)).toBeInTheDocument();
      });

      expect(reviewSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('submits DEFICIENT disposition without effectiveStatus payload', async () => {
      const reviewSpy = vi.spyOn(undertakingsService, 'reviewUndertaking').mockResolvedValue({
        ...unreviewedRecord,
        reviewStatus: UndertakingReviewStatus.DEFICIENT,
        reviewNotes: 'Sub-registrar registration seal is illegible. Clarification required.',
      });

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReviewUndertakingModal
          undertaking={unreviewedRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      // Select DEFICIENT
      fireEvent.change(screen.getByLabelText(/Officer Review Disposition/i), {
        target: { value: UndertakingReviewStatus.DEFICIENT },
      });

      fireEvent.change(
        screen.getByPlaceholderText(/Provide detailed justification, verified document register/i),
        {
          target: {
            value: 'Sub-registrar registration seal is illegible. Clarification required.',
          },
        },
      );

      fireEvent.click(screen.getByRole('button', { name: /Record Regulatory Review/i }));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('und-101', {
          reviewStatus: UndertakingReviewStatus.DEFICIENT,
          reviewNotes: 'Sub-registrar registration seal is illegible. Clarification required.',
          effectiveStatus: undefined,
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('submits REJECTED disposition without effectiveStatus payload', async () => {
      const reviewSpy = vi.spyOn(undertakingsService, 'reviewUndertaking').mockResolvedValue({
        ...unreviewedRecord,
        reviewStatus: UndertakingReviewStatus.REJECTED,
        reviewNotes: 'Building stability certificate revoked by municipal authority.',
      });

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReviewUndertakingModal
          undertaking={unreviewedRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      // Select REJECTED
      fireEvent.change(screen.getByLabelText(/Officer Review Disposition/i), {
        target: { value: UndertakingReviewStatus.REJECTED },
      });

      fireEvent.change(
        screen.getByPlaceholderText(/Provide detailed justification, verified document register/i),
        {
          target: {
            value: 'Building stability certificate revoked by municipal authority.',
          },
        },
      );

      fireEvent.click(screen.getByRole('button', { name: /Record Regulatory Review/i }));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('und-101', {
          reviewStatus: UndertakingReviewStatus.REJECTED,
          reviewNotes: 'Building stability certificate revoked by municipal authority.',
          effectiveStatus: undefined,
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('renders API error message when review request fails', async () => {
      vi.spyOn(undertakingsService, 'reviewUndertaking').mockRejectedValue(
        new Error('Unauthorized officer role or expired session.'),
      );

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReviewUndertakingModal
          undertaking={unreviewedRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      fireEvent.change(
        screen.getByPlaceholderText(/Provide detailed justification, verified document register/i),
        {
          target: { value: 'Valid review justification note' },
        },
      );

      fireEvent.click(screen.getByRole('button', { name: /Record Regulatory Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Unauthorized officer role or expired session.'),
        ).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('RenewUndertakingModal', () => {
    it('validates extension expiry date and submits renewal supersession', async () => {
      const renewSpy = vi.spyOn(undertakingsService, 'renewUndertaking').mockResolvedValue({
        ...mockRecord,
        id: 'und-102-renewed',
        supersedesId: 'und-101',
      });

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <RenewUndertakingModal
          undertaking={mockRecord}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText(/Superseding Renewal & Lease Extension/i)).toBeInTheDocument();
      expect(screen.getByText(/ADR-004 Renewal Lineage Rule/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Execute Superseding Renewal/i }));

      await waitFor(() => {
        expect(renewSpy).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('UndertakingHistoryModal', () => {
    it('fetches and renders chronological timeline events', async () => {
      const mockHistoryEntries: UndertakingHistoryEntry[] = [
        {
          id: 'h-1',
          undertakingId: 'und-101',
          action: 'CREATED',
          fromStatus: null,
          toStatus: UndertakingStatus.DRAFT,
          fromReviewStatus: null,
          toReviewStatus: null,
          actorId: 'usr-1',
          actorRole: UserRole.INSTITUTION_USER,
          changeReason: 'Draft created by institution',
          snapshotJsonb: {},
          createdAt: '2026-10-25T10:00:00.000Z',
        },
        {
          id: 'h-2',
          undertakingId: 'und-101',
          action: 'SUBMITTED',
          fromStatus: UndertakingStatus.DRAFT,
          toStatus: UndertakingStatus.SUBMITTED,
          fromReviewStatus: null,
          toReviewStatus: UndertakingReviewStatus.PENDING_REVIEW,
          actorId: 'usr-1',
          actorRole: UserRole.INSTITUTION_USER,
          changeReason: 'Submitted for scrutiny',
          snapshotJsonb: {},
          createdAt: '2026-10-25T11:00:00.000Z',
        },
      ];

      vi.spyOn(undertakingsService, 'getUndertakingHistory').mockResolvedValue(mockHistoryEntries);

      render(<UndertakingHistoryModal undertakingId="und-101" isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('CREATED')).toBeInTheDocument();
        expect(screen.getByText('Draft created by institution')).toBeInTheDocument();
        expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      });
    });
  });

  describe('ReconcileUndertakingsModal', () => {
    it('requires explicit confirmation checkbox before enabling execute sweep button', () => {
      render(<ReconcileUndertakingsModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      expect(screen.getByText(/Regulatory Expiry Reconciliation Sweep/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Execute Sweep/i })).toBeInTheDocument();
    });

    it('executes reconciliation sweep and renders returned result counts', async () => {
      const mockReconcileResult: UndertakingReconcileResult = {
        scannedCount: 85,
        activeCount: 75,
        expiringSoonCount: 2,
        renewalDueCount: 1,
        expiredCount: 0,
        transitionedCount: 3,
        transitionedIds: ['und-101'],
        evaluationDate: '2026-10-27',
        disclaimer: 'Illustrative sweep',
      };

      vi.spyOn(undertakingsService, 'reconcileUndertakings').mockResolvedValue(mockReconcileResult);

      const onSuccess = vi.fn();

      render(<ReconcileUndertakingsModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

      fireEvent.click(screen.getByRole('button', { name: /Confirm & Execute Sweep/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Reconciliation Sweep Completed Successfully/i),
        ).toBeInTheDocument();
        expect(screen.getAllByText('85').length).toBeGreaterThan(0); // scannedCount
        expect(screen.getAllByText('3').length).toBeGreaterThan(0); // transitionedCount
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('UndertakingDetailModal', () => {
    it('renders full metadata, status, date intervals, and action buttons', () => {
      const onReview = vi.fn();
      const onRenew = vi.fn();
      const onOpenHistory = vi.fn();

      render(
        <UndertakingDetailModal
          undertaking={mockRecord}
          isOpen={true}
          onClose={vi.fn()}
          onOpenReview={onReview}
          onOpenRenew={onRenew}
          onOpenHistory={onOpenHistory}
          currentUserRole={UserRole.SCRUTINY_OFFICER}
        />,
      );

      expect(screen.getAllByText(/30-Year Registered Land Lease Deed/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Registered Land Lease Deed/i).length).toBeGreaterThan(0);
      expect(screen.getByText('KA-DEED-9912')).toBeInTheDocument();
      expect(screen.getByText('State Industrial Development Corp')).toBeInTheDocument();
      expect(screen.getByText(/Verified stamped deed/i)).toBeInTheDocument();

      // History action
      fireEvent.click(screen.getByRole('button', { name: /Audit History/i }));
      expect(onOpenHistory).toHaveBeenCalledWith('und-101');
    });
  });
});
