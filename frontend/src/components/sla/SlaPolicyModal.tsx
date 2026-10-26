/**
 * ApprovalSync — Configured SLA Policies Modal
 * Milestone: FE-05
 *
 * Displays configured stage SLA policies, target durations, warning thresholds,
 * authorized pause flags, and the mandatory illustrative demonstration disclaimer.
 */

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Modal, Button, Alert, Spinner } from '../ui';
import { slaService } from '../../api/services/slaService';
import { SlaPolicyProjection } from '../../sla/types';
import { formatRoleName } from '../../auth/roleRoutes';

export interface SlaPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policies?: SlaPolicyProjection[];
}

export function SlaPolicyModal({
  isOpen,
  onClose,
  policies: initialPolicies,
}: SlaPolicyModalProps): React.ReactElement {
  const [policies, setPolicies] = useState<SlaPolicyProjection[]>(initialPolicies || []);
  const [isLoading, setIsLoading] = useState(!initialPolicies || initialPolicies.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPolicies && initialPolicies.length > 0) {
      setPolicies(initialPolicies);
      setIsLoading(false);
      return;
    }
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      slaService
        .getPolicies()
        .then((data) => setPolicies(data))
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : 'Failed to retrieve configured SLA policies.',
          );
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, initialPolicies]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configured Stage SLA Policies & Benchmarks"
      description="Inspect configured stage durations, escalation tiers, warning thresholds, and pause permissions."
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Close Policy Guide
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Mandatory Regulatory Disclaimer Banner */}
        <Alert variant="warning" title="Illustrative Demonstration Policy Disclaimer">
          Illustrative demonstration SLA policy only. AICTE statutory processing timelines are
          determined by the official AICTE Approval Process Handbook (APH) and Gazette
          notifications. These configured thresholds serve as prototype benchmarks for the Smart
          India Hackathon evaluation and must not be cited as binding statutory AICTE rejection
          criteria.
        </Alert>

        {isLoading ? (
          <div style={{ padding: 'var(--space-6) 0', display: 'flex', justifyContent: 'center' }}>
            <Spinner label="Loading configured SLA policies..." />
          </div>
        ) : error ? (
          <Alert variant="error" title="Failed to Load Policies">
            {error}
          </Alert>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {policies.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  <div>
                    <h5
                      style={{
                        margin: 0,
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 600,
                        color: 'var(--color-foreground)',
                      }}
                    >
                      {p.name}
                    </h5>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--color-muted-foreground)',
                      }}
                    >
                      Stage: <strong>{p.stage}</strong> • Policy ID: <code>{p.id}</code>
                    </span>
                  </div>

                  <span
                    className="badge badge-primary"
                    style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}
                  >
                    {p.duration} {p.unit}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                    margin: 'var(--space-1) 0 var(--space-2) 0',
                    lineHeight: 1.4,
                  }}
                >
                  {p.description}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 'var(--space-2)',
                    fontSize: '0.6875rem',
                    backgroundColor: 'var(--color-muted)',
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>
                      Warning Threshold:
                    </span>
                    <div style={{ fontWeight: 600 }}>
                      {Math.round(p.warningThresholdFraction * 100)}% of target
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>Warning Target:</span>
                    <div style={{ fontWeight: 600 }}>{formatRoleName(p.warningTargetRole)}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>Breach Target:</span>
                    <div style={{ fontWeight: 600 }}>{formatRoleName(p.breachTargetRole)}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>
                      Regulatory Pause:
                    </span>
                    <div
                      style={{
                        fontWeight: 600,
                        color: p.canPause
                          ? 'var(--color-success)'
                          : 'var(--color-muted-foreground)',
                      }}
                    >
                      {p.canPause ? 'Authorized' : 'Disallowed'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.625rem',
                    color: 'var(--color-muted-foreground)',
                    marginTop: 'var(--space-1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Info size={11} aria-hidden="true" />
                  <span>
                    Source Benchmark: {p.sourceReference} (v{p.version})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
