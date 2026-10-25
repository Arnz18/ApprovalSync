import React from 'react';
import { Users, CheckCircle2, XCircle, Clock, Shield, FileCode2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { ApplicationProjection } from '../../applications/types';
import { ApplicationStatus } from '../../api/types';
import { ComplianceAssessmentResult } from '../../evc/types';
import { WorkflowTimelineEvent, AllowedTransition } from '../../scrutiny/types';
import { formatRoleName } from '../../auth/roleRoutes';

interface CommitteeReviewViewProps {
  application: ApplicationProjection;
  compliance?: ComplianceAssessmentResult | null;
  timelineEvents: WorkflowTimelineEvent[];
  allowedTransitions: AllowedTransition[];
  onOpenTransitionModal: (targetStatus: ApplicationStatus) => void;
}

export const CommitteeReviewView: React.FC<CommitteeReviewViewProps> = ({
  application,
  compliance,
  timelineEvents,
  allowedTransitions,
  onOpenTransitionModal,
}) => {
  const isShcActive = application.status === ApplicationStatus.RECOMMENDED_FOR_SHC;
  const isApproved = application.status === ApplicationStatus.APPROVED;
  const isRejected = application.status === ApplicationStatus.REJECTED;

  // Find the event where application was escalated to SHC
  const escalationEvent = timelineEvents.find(
    (e) => e.toStatus === ApplicationStatus.RECOMMENDED_FOR_SHC,
  );

  // Critical or advisory severity findings
  const criticalFindings =
    compliance?.findings.filter(
      (f) => f.severity === 'CRITICAL_DEFICIENCY' || f.severity === 'ADVISORY_FLAG',
    ) || [];

  const canApprove = allowedTransitions.some((t) => t.toStatus === ApplicationStatus.APPROVED);
  const canReject = allowedTransitions.some((t) => t.toStatus === ApplicationStatus.REJECTED);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Committee Hearing Status Banner */}
      <div>
        <Alert
          variant={isShcActive ? 'warning' : 'info'}
          title={
            isShcActive
              ? 'Standing Hearing Committee (SHC) Review Active'
              : 'Committee Workspace Context'
          }
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Users size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              {isShcActive ? (
                <>
                  This application has been formally escalated to the{' '}
                  <strong>Standing Hearing Committee (SHC)</strong> following scrutiny and ground
                  inspection findings. Authorized Bureau Heads and Committee Members review
                  unresolved institutional discrepancies before enacting the final statutory
                  disposition.
                </>
              ) : isApproved ? (
                <>
                  The committee review cycle is complete. Statutory Approval was granted and
                  recorded in the audit ledger.
                </>
              ) : isRejected ? (
                <>
                  The committee review cycle is complete. Final Statutory Rejection was issued and
                  recorded in the audit ledger.
                </>
              ) : (
                <>
                  This case is currently at stage <strong>{application.status}</strong>. If ground
                  inspection or document scrutiny uncovers material deficiencies, authorized
                  officers can escalate the dossier to SHC.
                </>
              )}
            </span>
          </div>
        </Alert>
      </div>

      {/* 2. Escalation Provenance & Hearing Context */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            margin: '0 0 var(--space-4) 0',
          }}
        >
          Escalation Provenance & Audit Trail
        </h2>

        {escalationEvent ? (
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge variant="warning">Escalated to SHC</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  By {formatRoleName(escalationEvent.actorRole)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={12} aria-hidden="true" />
                <time dateTime={escalationEvent.createdAt}>
                  {new Date(escalationEvent.createdAt).toLocaleString()}
                </time>
              </div>
            </div>

            {escalationEvent.comment ? (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--color-warning)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-foreground)',
                }}
              >
                <strong>Escalation Justification:</strong> {escalationEvent.comment}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                No textual justification was provided in the escalation transition payload.
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-muted-foreground)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            No formal SHC escalation event recorded in the chronological workflow audit log.
          </div>
        )}
      </Card>

      {/* 3. Unresolved Discrepancies & Deficiencies Summary */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
            }}
          >
            Material Discrepancies & Compliance Deficiencies (DOC-06)
          </h2>
          <Badge variant={criticalFindings.length > 0 ? 'error' : 'success'}>
            {criticalFindings.length} High/Critical Finding
            {criticalFindings.length === 1 ? '' : 's'}
          </Badge>
        </div>

        {criticalFindings.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            <CheckCircle2 size={16} aria-hidden="true" style={{ color: 'var(--color-success)' }} />
            <span>
              No critical or high-severity compliance findings flagged by automated verification
              heuristics.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {criticalFindings.map((finding) => (
              <div
                key={finding.id}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-surface-hover)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${
                    finding.severity === 'CRITICAL_DEFICIENCY'
                      ? 'var(--color-error)'
                      : 'var(--color-warning)'
                  }`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      {finding.title}
                    </span>
                    <Badge
                      variant={finding.severity === 'CRITICAL_DEFICIENCY' ? 'error' : 'warning'}
                      style={{ fontSize: '10px' }}
                    >
                      {finding.severity}
                    </Badge>
                    <Badge variant="default" style={{ fontSize: '10px' }}>
                      {finding.category}
                    </Badge>
                  </div>
                  {finding.ruleCode && (
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: 'var(--color-muted-foreground)',
                      }}
                    >
                      {finding.ruleCode}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {finding.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Authorized Post-Hearing Statutory Decisions */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <Shield size={20} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
          <h2
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
            }}
          >
            Statutory Decision Authority (BE-06 Workflow Guards)
          </h2>
        </div>

        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
            margin: '0 0 var(--space-4) 0',
          }}
        >
          In accordance with AICTE approval regulations, only the <strong>Bureau Head</strong> or
          authorized regulatory authority may grant final approval or statutory rejection following
          Standing Hearing Committee review.
        </p>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}
        >
          {canApprove && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenTransitionModal(ApplicationStatus.APPROVED)}
            >
              <CheckCircle2 size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
              Grant Statutory Approval
            </Button>
          )}

          {canReject && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onOpenTransitionModal(ApplicationStatus.REJECTED)}
            >
              <XCircle size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
              Issue Statutory Rejection
            </Button>
          )}

          {!canApprove && !canReject && (
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                fontStyle: 'italic',
              }}
            >
              {isApproved
                ? 'Application is in terminal state APPROVED. No further committee transitions permitted.'
                : isRejected
                  ? 'Application is in terminal state REJECTED. No further committee transitions permitted.'
                  : 'No post-hearing transitions are currently permitted for your authenticated user role.'}
            </div>
          )}
        </div>
      </Card>

      {/* 5. Committee Minutes & Vote Storage Backend Contract Proposal */}
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
            Proposed Backend Contract Proposal: Committee Minutes & Hearing Records API
          </h2>
        </div>

        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
            margin: '0 0 var(--space-3) 0',
          }}
        >
          Prepared contract for M1 (Contracts) and M2 (Backend) to store individual committee member
          votes and hearing minutes:
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
          {`POST /api/v1/applications/:applicationId/committee-recommendations
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "committeeType": "SHC",
  "hearingDate": "2026-11-20T11:00:00.000Z",
  "quorumPresent": true,
  "attendees": [
    { "name": "Prof. A. K. Sharma", "designation": "Committee Chairman" },
    { "name": "Dr. R. Venkat", "designation": "Regional Representative" }
  ],
  "recommendation": "APPROVED_WITH_CONDITIONS",
  "hearingMinutes": "Institution presented rectified fire NOC and revised building sanction plan.",
  "unresolvedDeficienciesAddressed": true
}`}
        </pre>
      </Card>
    </div>
  );
};
