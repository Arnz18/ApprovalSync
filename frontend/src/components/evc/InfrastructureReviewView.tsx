import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  HelpCircle,
  Building,
  Flame,
  Accessibility,
  Compass,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ComplianceAssessmentResult, ComplianceFinding, ComplianceSeverity } from '../../evc/types';

interface InfrastructureReviewViewProps {
  compliance?: ComplianceAssessmentResult | null;
  isLoading: boolean;
}

export const InfrastructureReviewView: React.FC<InfrastructureReviewViewProps> = ({
  compliance,
  isLoading,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  if (isLoading && !compliance) {
    return (
      <div
        style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
          color: 'var(--color-muted-foreground)',
        }}
      >
        <div style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}>
          <Layers size={32} className="animate-spin" aria-hidden="true" />
        </div>
        <p>Evaluating DOC-06 compliance evidence and infrastructure review heuristics...</p>
      </div>
    );
  }

  if (!compliance) {
    return (
      <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <HelpCircle
          size={36}
          aria-hidden="true"
          style={{ color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-3)' }}
        />
        <h3 style={{ margin: '0 0 var(--space-2) 0' }}>No Compliance Assessment Available</h3>
        <p style={{ color: 'var(--color-muted-foreground)', maxWidth: '500px', margin: '0 auto' }}>
          This application has not yet been processed by the automated DOC-06 compliance assist
          engine. Click "Re-evaluate Compliance" in the header to run rule checks.
        </p>
      </Card>
    );
  }

  const { summary, infrastructureReview, findings } = compliance;
  const safeFindings = Array.isArray(findings) ? findings : [];

  const filteredFindings = safeFindings.filter((f) => {
    if (selectedSeverity === 'ALL') return true;
    return f.severity === selectedSeverity;
  });

  const getSeverityBadge = (severity: ComplianceSeverity) => {
    switch (severity) {
      case 'CRITICAL_DEFICIENCY':
        return <Badge variant="error">Critical Deficiency</Badge>;
      case 'ADVISORY_FLAG':
        return <Badge variant="warning">Advisory Flag</Badge>;
      case 'COMPLIANT':
        return <Badge variant="success">Compliant</Badge>;
      default:
        return <Badge variant="default">{severity}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Summary Metrics Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <Card style={{ padding: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Total Rules Evaluated
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginTop: 'var(--space-1)',
            }}
          >
            {summary.totalRulesEvaluated}
          </div>
          <div
            style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', marginTop: '2px' }}
          >
            Versioned AICTE APH Policies
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Critical Deficiencies
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginTop: 'var(--space-1)',
              color:
                summary.criticalDeficienciesCount > 0
                  ? 'var(--color-error)'
                  : 'var(--color-success)',
            }}
          >
            {summary.criticalDeficienciesCount}
          </div>
          <div
            style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', marginTop: '2px' }}
          >
            {summary.criticalDeficienciesCount > 0
              ? 'Requires remediation'
              : 'No statutory violations'}
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Advisory Anomaly Flags
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginTop: 'var(--space-1)',
              color:
                summary.advisoryFlagsCount > 0 ? 'var(--color-warning)' : 'var(--color-foreground)',
            }}
          >
            {summary.advisoryFlagsCount}
          </div>
          <div
            style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', marginTop: '2px' }}
          >
            AI heuristics / observations
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Compliant Rules
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginTop: 'var(--space-1)',
              color: 'var(--color-success)',
            }}
          >
            {summary.compliantCount}
          </div>
          <div
            style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', marginTop: '2px' }}
          >
            Verified documentary criteria
          </div>
        </Card>

        <Card
          style={{
            padding: 'var(--space-4)',
            borderLeft: summary.requiresPhysicalInspection
              ? '4px solid var(--color-warning)'
              : '4px solid var(--color-success)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            EVC Physical Inspection
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              marginTop: 'var(--space-1)',
              color: summary.requiresPhysicalInspection
                ? 'var(--color-warning)'
                : 'var(--color-success)',
            }}
          >
            {summary.requiresPhysicalInspection ? 'RECOMMENDED' : 'NOT REQUIRED'}
          </div>
          <div
            style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', marginTop: '2px' }}
          >
            {summary.inspectionRecommendedCount} trigger rule
            {summary.inspectionRecommendedCount === 1 ? '' : 's'}
          </div>
        </Card>
      </div>

      {/* 2. Infrastructure Heuristics Card (DOC-06 Heuristics) */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Compass size={20} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
            }}
          >
            Physical Infrastructure Sanity Heuristics (DOC-06)
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Land Area Norm */}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                LAND AREA NORMS
              </span>
              {infrastructureReview.landCompliant ? (
                <CheckCircle2
                  size={16}
                  aria-hidden="true"
                  style={{ color: 'var(--color-success)' }}
                />
              ) : (
                <XCircle size={16} aria-hidden="true" style={{ color: 'var(--color-error)' }} />
              )}
            </div>
            <div
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {infrastructureReview.landCompliant
                ? 'Meets Regulatory Threshold'
                : 'Land Shortfall Detected'}
            </div>
          </div>

          {/* Built-up Instructional Area */}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                BUILT-UP AREA NORMS
              </span>
              <Building
                size={16}
                aria-hidden="true"
                style={{
                  color: infrastructureReview.builtUpAreaCompliant
                    ? 'var(--color-success)'
                    : 'var(--color-error)',
                }}
              />
            </div>
            <div
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {infrastructureReview.builtUpAreaCompliant
                ? 'Area Satisfies Intake Norms'
                : 'Instructional Area Shortfall'}
            </div>
          </div>

          {/* Barrier-Free Accessibility */}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                BARRIER-FREE ACCESS
              </span>
              <Accessibility
                size={16}
                aria-hidden="true"
                style={{
                  color: infrastructureReview.barrierFreeDeclared
                    ? 'var(--color-success)'
                    : 'var(--color-warning)',
                }}
              />
            </div>
            <div
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {infrastructureReview.barrierFreeDeclared
                ? 'Statutory Ramps/Lifts Declared'
                : 'Missing Accessibility Proof'}
            </div>
          </div>

          {/* Fire Safety Certificate */}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                FIRE SAFETY CLEARANCE
              </span>
              <Flame
                size={16}
                aria-hidden="true"
                style={{
                  color: infrastructureReview.fireSafetyValid
                    ? 'var(--color-success)'
                    : 'var(--color-error)',
                }}
              />
            </div>
            <div
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {infrastructureReview.fireSafetyValid
                ? 'Valid Unexpired Certificate'
                : 'Expired / Missing Fire Clearance'}
            </div>
          </div>
        </div>

        {/* Triggers List */}
        {infrastructureReview.inspectionTriggerReasons &&
          infrastructureReview.inspectionTriggerReasons.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid var(--color-warning)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-warning)',
                }}
              >
                <AlertTriangle size={16} aria-hidden="true" />
                On-Site EVC Inspection Triggers:
              </div>
              <ul
                style={{
                  margin: 'var(--space-2) 0 0 var(--space-5)',
                  padding: 0,
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                {infrastructureReview.inspectionTriggerReasons.map((reason, idx) => (
                  <li key={`trig-${idx}`} style={{ marginBottom: '2px' }}>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Heuristic Limitations */}
        {infrastructureReview.heuristicLimitations &&
          infrastructureReview.heuristicLimitations.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-3)',
                fontSize: '11px',
                color: 'var(--color-muted-foreground)',
                fontStyle: 'italic',
              }}
            >
              <strong>Heuristic Limitations:</strong>{' '}
              {infrastructureReview.heuristicLimitations.join(' • ')}
            </div>
          )}
      </Card>

      {/* 3. Detailed Compliance Findings Matrix */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
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
              Evidence-Linked Compliance Findings Matrix
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: '2px 0 0 0',
              }}
            >
              Rule-by-rule evaluation against versioned AICTE Approval Process Handbook (APH)
              standards.
            </p>
          </div>

          {/* Severity Filter Tabs */}
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {(['ALL', 'CRITICAL_DEFICIENCY', 'ADVISORY_FLAG', 'COMPLIANT'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background:
                    selectedSeverity === sev ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selectedSeverity === sev ? '#ffffff' : 'var(--color-foreground)',
                  cursor: 'pointer',
                  fontWeight:
                    selectedSeverity === sev
                      ? 'var(--font-weight-semibold)'
                      : 'var(--font-weight-normal)',
                }}
              >
                {sev === 'ALL' && `All (${safeFindings.length})`}
                {sev === 'CRITICAL_DEFICIENCY' && `Critical (${summary.criticalDeficienciesCount})`}
                {sev === 'ADVISORY_FLAG' && `Advisory (${summary.advisoryFlagsCount})`}
                {sev === 'COMPLIANT' && `Compliant (${summary.compliantCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Findings List */}
        {filteredFindings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-6)',
              color: 'var(--color-muted-foreground)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            No compliance findings match the selected severity filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filteredFindings.map((finding: ComplianceFinding) => (
              <div
                key={finding.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  borderLeft:
                    finding.severity === 'CRITICAL_DEFICIENCY'
                      ? '4px solid var(--color-error)'
                      : finding.severity === 'ADVISORY_FLAG'
                        ? '4px solid var(--color-warning)'
                        : '4px solid var(--color-success)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      {finding.title}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-muted-foreground)',
                      }}
                    >
                      [{finding.findingCode}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border-subtle)',
                        color: 'var(--color-muted-foreground)',
                      }}
                    >
                      {finding.category}
                    </span>
                    {getSeverityBadge(finding.severity)}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    margin: 'var(--space-2) 0',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {finding.description}
                </p>

                {/* Linked Rule & Citation */}
                {finding.ruleCode && (
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-muted-foreground)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    <strong>Standard Rule:</strong> {finding.ruleCode}{' '}
                    {finding.sourceClause && `(Clause: ${finding.sourceClause})`}
                  </div>
                )}

                {/* Evidence References */}
                {finding.evidence && finding.evidence.length > 0 && (
                  <div
                    style={{
                      background: 'var(--color-surface-hover)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-xs)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    <strong>Documentary Evidence:</strong>
                    <ul style={{ margin: 'var(--space-1) 0 0 var(--space-4)', padding: 0 }}>
                      {finding.evidence.map((ev, idx) => (
                        <li key={`ev-${idx}`}>
                          {ev.documentType || ev.fileName || 'Attachment'}{' '}
                          {ev.fieldKey &&
                            `— Extracted: "${ev.extractedValue}" vs Declared: "${ev.declaredValue}"`}{' '}
                          {ev.pageNumber && `(Page ${ev.pageNumber})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Next Action */}
                {finding.recommendedAction && (
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-foreground)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    <strong>Recommended Reviewer Action:</strong> {finding.recommendedAction}
                  </div>
                )}

                {/* Physical Inspection Flag */}
                {finding.requiresPhysicalInspection && (
                  <div
                    style={{
                      marginTop: 'var(--space-2)',
                      fontSize: '11px',
                      color: 'var(--color-warning)',
                      fontWeight: 'var(--font-weight-semibold)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangle size={12} aria-hidden="true" />
                    Triggers mandatory on-site physical inspection by Expert Visit Committee.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
