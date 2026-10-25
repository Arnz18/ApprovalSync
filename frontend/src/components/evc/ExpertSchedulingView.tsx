import React from 'react';
import { AlertCircle, Compass, FileCode2, Lock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { ApplicationProjection } from '../../applications/types';
import { ApplicationStatus } from '../../api/types';
import { ComplianceAssessmentResult } from '../../evc/types';

interface ExpertSchedulingViewProps {
  application: ApplicationProjection;
  compliance?: ComplianceAssessmentResult | null;
}

export const ExpertSchedulingView: React.FC<ExpertSchedulingViewProps> = ({
  application,
  compliance,
}) => {
  const isEvcRecommended = application.status === ApplicationStatus.RECOMMENDED_FOR_EVC;
  const isEvcInProgress = application.status === ApplicationStatus.EVC_IN_PROGRESS;
  const isShcRecommended = application.status === ApplicationStatus.RECOMMENDED_FOR_SHC;
  const isApproved = application.status === ApplicationStatus.APPROVED;
  const isRejected = application.status === ApplicationStatus.REJECTED;

  const getWorkflowStageTitle = () => {
    if (isEvcRecommended) return 'Awaiting Expert Visit Committee Assignment';
    if (isEvcInProgress) return 'EVC Ground Inspection Active / In Progress';
    if (isShcRecommended) return 'Escalated to Standing Hearing Committee (SHC)';
    if (isApproved) return 'Statutory Approval Granted (Inspection Concluded)';
    if (isRejected) return 'Statutory Rejection Issued (Inspection Concluded)';
    return `Application in Stage: ${application.status}`;
  };

  const getStatusBadge = () => {
    if (isEvcRecommended) return <Badge variant="primary">Awaiting Inspector Roster</Badge>;
    if (isEvcInProgress) return <Badge variant="info">Inspection In Progress</Badge>;
    if (isShcRecommended) return <Badge variant="warning">Committee Escalation</Badge>;
    if (isApproved) return <Badge variant="success">Completed & Approved</Badge>;
    if (isRejected) return <Badge variant="error">Completed & Rejected</Badge>;
    return <Badge variant="default">{application.status}</Badge>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Contract & Capability Boundary Notice */}
      <div>
        <Alert variant="info" title="Expert Roster & Scheduling Persistence Boundary">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Contract Boundary:</strong> Centralized expert roster scheduling and inspector
              conflict-of-interest declarations are handled at the state machine level via BE-06
              workflow transitions (e.g. <code>RECOMMENDED_FOR_EVC &rarr; EVC_IN_PROGRESS</code>). A
              dedicated scheduling mutation endpoint (
              <code>POST /api/v1/applications/:id/evc-assignments</code>) is currently under M1/M2
              backend specification. Per architectural governance, frontend does not simulate
              persisted appointments.
            </span>
          </div>
        </Alert>
      </div>

      {/* 2. Current Case Assignment Status */}
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
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
              }}
            >
              EVC Inspection Assignment Overview
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: '2px 0 0 0',
              }}
            >
              Authoritative case progress derived from server-verified workflow FSM state.
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                marginBottom: '4px',
              }}
            >
              CURRENT INSPECTION STAGE
            </div>
            <div
              style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}
            >
              {getWorkflowStageTitle()}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                marginBottom: '4px',
              }}
            >
              INSPECTION MODE (DOC-06)
            </div>
            <div
              style={{
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Compass size={14} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
              {compliance?.infrastructureReview?.evcInspectionRecommended
                ? 'On-Site Physical Inspection'
                : 'Documentary Review / Virtual'}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                marginBottom: '4px',
              }}
            >
              JURISDICTION / REGION
            </div>
            <div
              style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}
            >
              {application.institution?.state
                ? `${application.institution.state} Regional Office`
                : 'National AICTE Jurisdiction'}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                marginBottom: '4px',
              }}
            >
              APPOINTMENT PERSISTENCE
            </div>
            <div
              style={{
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted-foreground)',
              }}
            >
              Workflow Transition Bound
            </div>
          </div>
        </div>

        {/* Action Button (Disabled with Contract Explanation) */}
        <div
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}>
            To activate inspection, an authorized <strong>EVC Inspector</strong> or{' '}
            <strong>Regional Officer</strong> executes the transition from the header toolbar.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Centralized expert scheduling endpoint awaiting backend delivery (M1/M2)"
            >
              <Lock size={14} aria-hidden="true" style={{ marginRight: '4px' }} />
              Schedule Specific Expert Visit (Unpersisted)
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Proposed Backend Contract Specification for M1 / M2 */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <FileCode2 size={20} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
          <h2
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
            }}
          >
            Proposed Backend Contract Proposal: Expert Roster & Assignment API
          </h2>
        </div>

        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
            margin: '0 0 var(--space-3) 0',
          }}
        >
          Documented specification prepared for M1 (Contracts) and M2 (Backend) to formalize
          granular expert roster persistence:
        </p>

        <pre
          style={{
            background: 'var(--color-surface-hover)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: '11px',
            fontFamily: 'monospace',
            overflowX: 'auto',
            margin: 0,
          }}
        >
          {`POST /api/v1/applications/:applicationId/evc-assignments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "leadInspectorUserId": "uuid-v4",
  "inspectionDate": "2026-11-15T09:30:00.000Z",
  "inspectionMode": "ON_SITE_PHYSICAL",
  "conflictOfInterestDeclared": true,
  "jurisdictionConfirmed": true,
  "notes": "Coordinating physical floor area confirmation with institutional representative."
}`}
        </pre>
      </Card>
    </div>
  );
};
