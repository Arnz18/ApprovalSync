import React, { useEffect, useState } from 'react';
import { Layers, Activity, Clock, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { workflowService } from '../../api/services/workflowService';

interface StageConfig {
  key: string;
  label: string;
  color: string;
  badgeBg: string;
  group: 'Intake' | 'Scrutiny' | 'EVC/Inspection' | 'Final Committee';
}

const STAGES: StageConfig[] = [
  { key: 'DRAFT', label: 'Draft Preparation', color: '#64748b', badgeBg: '#f1f5f9', group: 'Intake' },
  { key: 'SUBMITTED', label: 'Submitted / Intake Queue', color: '#0284c7', badgeBg: '#e0f2fe', group: 'Intake' },
  { key: 'UNDER_SCRUTINY', label: 'Under Primary Scrutiny', color: '#2563eb', badgeBg: '#dbeafe', group: 'Scrutiny' },
  { key: 'DEFICIENCY_ISSUED', label: 'Deficiency Communicated', color: '#d97706', badgeBg: '#fef3c7', group: 'Scrutiny' },
  { key: 'RESUBMITTED', label: 'Re-Scrutiny Verification', color: '#7c3aed', badgeBg: '#ede9fe', group: 'Scrutiny' },
  { key: 'RECOMMENDED_FOR_EVC', label: 'Awaiting EVC Committee', color: '#0891b2', badgeBg: '#cffafe', group: 'EVC/Inspection' },
  { key: 'EVC_IN_PROGRESS', label: 'EVC Ground Inspection Active', color: '#0d9488', badgeBg: '#ccfbf1', group: 'EVC/Inspection' },
  { key: 'RECOMMENDED_FOR_SHC', label: 'Standing Hearing Committee (SHC)', color: '#dc2626', badgeBg: '#fee2e2', group: 'Final Committee' },
  { key: 'APPROVED', label: 'AICTE Approval Accorded', color: '#16a34a', badgeBg: '#dcfce7', group: 'Final Committee' },
  { key: 'REJECTED', label: 'Statutory Rejection Issued', color: '#b91c1c', badgeBg: '#fef2f2', group: 'Final Committee' },
];

export const StagePendencyChart: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    workflowService
      .getStagePendencyMetrics()
      .then((data: unknown) => {
        if (!isMounted) return;
        const counts: Record<string, number> = {};
        if (Array.isArray(data)) {
          data.forEach((item: { stage?: string; count?: number }) => {
            if (item.stage) counts[item.stage] = Number(item.count) || 0;
          });
        } else if (typeof data === 'object' && data !== null) {
          Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
            counts[k] = Number(v) || 0;
          });
        }
        setMetrics(counts);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const total = Object.values(metrics).reduce((a, b) => a + b, 0);

  return (
    <Card style={{ padding: 'var(--space-5)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Layers size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
              AICTE PS 26262: Stage-Wise Pendency &amp; Movement Monitor
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', margin: 0 }}>
              Real-time distribution of applications across approval lifecycle stages
            </p>
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#f1f5f9',
            color: '#334155',
          }}
        >
          <Activity size={12} /> Total Pipeline: {total} Case{total === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Computing stage pendency metrics...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {STAGES.map((stage) => {
            const count = metrics[stage.key] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: stage.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{stage.label}</span>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: stage.badgeBg,
                        color: stage.color,
                        fontWeight: 600,
                      }}
                    >
                      {stage.group}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{count}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', minWidth: '32px', textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: stage.color,
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} /> Time-bound escalation threshold applies to each stage transition
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={12} /> AICTE Regulation Bureau Automated Movement Tracking
        </span>
      </div>
    </Card>
  );
};
