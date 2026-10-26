/**
 * ApprovalSync — Privileged SLA Timer Reconciliation Banner
 * Milestone: FE-05
 *
 * Gated administrative control executing authoritative PostgreSQL reconciliation sweep
 * to evaluate overdue timers and emit warnings/breaches directly from database state.
 * Strictly restricted to SYSTEM_ADMIN; requires explicit user confirmation.
 */

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Modal,
  Alert,
} from '../ui';
import { slaService } from '../../api/services/slaService';
import { SlaReconcileResult, UserRole } from '../../sla/types';
import { formatIsoDateTime } from '../../sla/slaUtils';

export interface ManualReconciliationBannerProps {
  userRole?: UserRole;
  onReconciliationCompleted?: (result: SlaReconcileResult) => void;
}

export function ManualReconciliationBanner({
  userRole,
  onReconciliationCompleted,
}: ManualReconciliationBannerProps): React.ReactElement | null {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [result, setResult] = useState<SlaReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Privileged check: restricted to SYSTEM_ADMIN as enforced by backend RolesGuard
  const isAuthorized = userRole === UserRole.SYSTEM_ADMIN;
  if (!isAuthorized) {
    return null;
  }

  async function handleExecuteSweep() {
    setIsReconciling(true);
    setError(null);
    try {
      const res = await slaService.reconcileOverdueTimers();
      setResult(res);
      setIsConfirmModalOpen(false);
      if (onReconciliationCompleted) {
        onReconciliationCompleted(res);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to complete database SLA reconciliation sweep.';
      setError(message);
    } finally {
      setIsReconciling(false);
    }
  }

  return (
    <>
      <Card
        style={{
          border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
        }}
      >
        <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span
                  className="badge badge-default"
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                    fontSize: '0.625rem',
                    textTransform: 'uppercase',
                  }}
                >
                  System Administrator Action
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                Authoritative SLA Timer Database Reconciliation
              </CardTitle>
              <CardDescription>
                Execute an on-demand PostgreSQL sweep evaluating overdue active timers and emitting
                idempotent warning and breach escalation records.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isReconciling ? 'animate-spin' : ''} />}
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isReconciling}
            >
              Run Reconciliation Sweep
            </Button>
          </div>
        </CardHeader>

        {result && (
          <CardContent style={{ paddingTop: 'var(--space-2)' }}>
            <Alert
              variant="success"
              title="Reconciliation Sweep Completed Successfully"
              onClose={() => setResult(null)}
            >
              Evaluated {result.evaluatedCount} active timers at{' '}
              {formatIsoDateTime(result.reconciledAt)}. Emitted {result.warningsEmitted} warning
              notifications and recorded {result.breachesEmitted} target deadline breaches.
            </Alert>
          </CardContent>
        )}

        {error && (
          <CardContent style={{ paddingTop: 'var(--space-2)' }}>
            <Alert variant="error" title="Reconciliation Failed" onClose={() => setError(null)}>
              {error}
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Confirmation Modal Dialog */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isReconciling && setIsConfirmModalOpen(false)}
        title="Confirm Privileged SLA Reconciliation Sweep"
        description="This action executes an authoritative database sweep over all active application stage timers."
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isReconciling}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={handleExecuteSweep}
              isLoading={isReconciling}
              disabled={isReconciling}
            >
              Confirm &amp; Run Sweep
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Alert variant="warning" title="Privileged Operation">
            The reconciliation sweep operates directly on PostgreSQL records. It compares target and
            warning deadlines against system clock state, transitioning overdue timers to BREACHED
            status and generating immutable audit escalation events.
          </Alert>

          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-muted-foreground)',
              margin: 0,
            }}
          >
            This process is idempotent and will not generate duplicate escalation records for
            previously notified timers.
          </p>
        </div>
      </Modal>
    </>
  );
}
