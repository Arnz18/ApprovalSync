/**
 * ApprovalSync — Audit Ledger & Cryptographic Proofs Page Test Suite
 * Milestone: FE-07
 *
 * Covers AuditLedgerPage:
 * - Application UUID input and query param loading
 * - Checkpoint card and Merkle root display
 * - Sequential hash chain verification trigger
 * - Standalone inclusion proof mathematical verifier modal
 * - CSV export
 * - Cryptographic assurance scope and ADR-004 compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuditLedgerPage } from '../pages/AuditLedgerPage';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue, AuthUser } from '../auth/types';
import { auditService } from '../api/services/auditService';
import { AuditLogProjection, AuditCheckpointProjection } from '../audit/types';
import { UserRole } from '../api/types';

describe('AuditLedgerPage (FE-07)', () => {
  const mockCheckpoint: AuditCheckpointProjection = {
    id: 'cp-001',
    applicationId: 'app-uuid-1',
    sequenceNumber: '8',
    chainHeadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    merkleRootHash: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
    totalBlocks: 8,
    algorithm: 'SHA-256',
    createdAt: '2026-10-27T00:00:00.000Z',
  };

  const mockLogs: AuditLogProjection[] = [
    {
      sequenceNumber: '1',
      applicationId: 'app-uuid-1',
      actorId: 'usr-001',
      actorRole: UserRole.INSTITUTION_USER,
      eventType: 'APPLICATION_CREATED',
      payloadSnapshot: { academicYear: '2026-27' },
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      leafHash: '4a1f89c09930e15b2203cf7d5a570075d691bc13e3a479ff76f183709b1a5e12',
      currentHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
      timestamp: '2026-10-25T08:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditService, 'getAuditLogs').mockResolvedValue({
      items: mockLogs,
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    vi.spyOn(auditService, 'getCheckpoint').mockResolvedValue(mockCheckpoint);
  });

  function renderPage(initialEntries = ['/audit?applicationId=app-uuid-1']) {
    const mockUser: AuthUser = {
      id: 'auditor-1',
      email: 'auditor@synthetic.approvalsync.local',
      name: 'Independent Compliance Auditor',
      role: UserRole.AUDITOR,
      isActive: true,
      createdAt: '2026-10-20T00:00:00.000Z',
    };

    const authContextValue: AuthContextValue = {
      user: mockUser,
      status: 'AUTHENTICATED',
      isAuthenticated: true,
      isInitializing: false,
      initError: null,
      login: vi.fn(),
      logout: vi.fn(),
      retryInitialization: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuditLedgerPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  }

  it('loads audit logs and checkpoint snapshot for specified application UUID', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Cryptographic Audit Ledger/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Application Draft Created')).toBeInTheDocument();
    });

    // Checkpoint card
    expect(screen.getByText('Active Ledger Checkpoint')).toBeInTheDocument();
    expect(screen.getByText(/Total Events:/i)).toBeInTheDocument();
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('triggers hash chain verification from the page', async () => {
    const verifySpy = vi.spyOn(auditService, 'verifyChain').mockResolvedValue({
      isChainValid: true,
      applicationId: 'app-uuid-1',
      totalBlocksVerified: 8,
      merkleRootHash: mockCheckpoint.merkleRootHash,
      verifiedAt: '2026-10-27T00:00:00.000Z',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Verify Sequential Chain/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Verify Sequential Chain/i }));

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith('app-uuid-1');
      expect(screen.getByText('Sequential Chain Intact & Valid')).toBeInTheDocument();
    });
  });

  it('opens Standalone Merkle Proof Verifier modal on button click', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Standalone Proof Verifier/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Standalone Proof Verifier/i }));

    expect(
      screen.getByText('Standalone RFC 6962 Merkle Proof Mathematical Verifier'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Independently verifies inclusion of any leaf hash/i),
    ).toBeInTheDocument();
  });

  it('renders cryptographic assurance scope disclaimer', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Cryptographic Assurance Scope & Threat Model/i)).toBeInTheDocument();
      expect(
        screen.getAllByText(
          /Local cryptographic verification validates sequential block hash continuity/i,
        ).length,
      ).toBeGreaterThan(0);
    });
  });
});
