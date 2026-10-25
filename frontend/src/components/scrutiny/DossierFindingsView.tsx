import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DossierReport } from '../../scrutiny/types';

interface DossierFindingsViewProps {
  dossierReport: DossierReport | null;
  isLoading: boolean;
  onEvaluate: () => void;
  onSelectDocument?: (documentId: string) => void;
}

export const DossierFindingsView: React.FC<DossierFindingsViewProps> = ({
  dossierReport,
  isLoading,
  onEvaluate,
  onSelectDocument,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'ADVISORY' | 'COMPLIANT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  if (!dossierReport) {
    return (
      <Card>
        <CardContent style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <Layers size={48} aria-hidden="true" style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-3)' }} />
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-foreground)', marginBottom: 'var(--space-2)' }}>
              No Dossier Evaluation Generated
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-4)' }}>
              This application dossier has not yet undergone multi-pipeline automated verification synthesis (completeness, consistency, duplicates, tamper heuristics, and compliance review).
            </p>
            <Button type="button" variant="primary" onClick={onEvaluate} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>Run Automated Dossier Evaluation</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overallStatus, summary, findings, evaluatedAt, regulatoryCompliance } = dossierReport;

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFindings = findings.filter((f) => {
    if (severityFilter === 'CRITICAL' && f.severity !== 'CRITICAL_DEFICIENCY') return false;
    if (severityFilter === 'ADVISORY' && f.severity !== 'ADVISORY_FLAG') return false;
    if (severityFilter === 'COMPLIANT' && f.severity !== 'COMPLIANT') return false;
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(findings.map((f) => f.category)));

  const formatEvaluatedDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Overall Status & Summary Banner Card */}
      <Card>
        <CardContent style={{ padding: 'var(--space-5)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              borderBottom: '1px solid var(--color-border-subtle)',
              paddingBottom: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-muted-foreground)' }}>
                Consolidated Disposition:
              </span>
              {overallStatus === 'COMPLIANT' && (
                <Badge variant="success" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1) var(--space-3)' }}>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <span>Compliant Dossier</span>
                </Badge>
              )}
              {overallStatus === 'REQUIRES_REVIEW' && (
                <Badge variant="warning" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1) var(--space-3)' }}>
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>Requires Review (Advisory Flags)</span>
                </Badge>
              )}
              {overallStatus === 'DEFICIENT' && (
                <Badge variant="error" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-1) var(--space-3)' }}>
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>Deficient Dossier</span>
                </Badge>
              )}

              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={12} aria-hidden="true" />
                <span>Evaluated: {formatEvaluatedDate(evaluatedAt)}</span>
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEvaluate}
              disabled={isLoading}
              aria-label="Re-evaluate dossier verification report"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>Re-evaluate Dossier</span>
            </Button>
          </div>

          {/* Metric KPI Tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: summary.criticalDeficienciesCount > 0 ? '#FEF2F2' : 'var(--color-background)',
                border: summary.criticalDeficienciesCount > 0 ? '1px solid #FECACA' : '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Critical Deficiencies
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 700,
                  color: summary.criticalDeficienciesCount > 0 ? 'var(--color-error)' : 'var(--color-foreground)',
                  marginTop: '2px',
                }}
              >
                {summary.criticalDeficienciesCount}
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: summary.advisoryFlagsCount > 0 ? '#FFFBEB' : 'var(--color-background)',
                border: summary.advisoryFlagsCount > 0 ? '1px solid #FDE68A' : '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Advisory Flags
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 700,
                  color: summary.advisoryFlagsCount > 0 ? 'var(--color-warning)' : 'var(--color-foreground)',
                  marginTop: '2px',
                }}
              >
                {summary.advisoryFlagsCount}
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Compliant Rules
              </div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)', marginTop: '2px' }}>
                {summary.compliantCount} / {summary.totalRulesEvaluated}
              </div>
            </div>

            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Issuer Verified (DOC-05)
              </div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-foreground)', marginTop: '2px' }}>
                {summary.issuerVerificationSummary?.verifiedCount || 0}
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-muted-foreground)', marginLeft: '4px' }}>
                  ({summary.issuerVerificationSummary?.simulatedCount || 0} Simulated)
                </span>
              </div>
            </div>
          </div>

          {/* Physical Inspection Recommendation Banner */}
          {summary.requiresPhysicalInspection && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
              }}
            >
              <MapPin size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <div>
                <strong style={{ color: '#78350F', display: 'block' }}>
                  On-Site Expert Visit Committee (EVC) Inspection Recommended
                </strong>
                <span style={{ fontSize: 'var(--font-size-xs)', color: '#92400E' }}>
                  Regulatory rules or infrastructure heuristics flagged physical plant discrepancies requiring physical verification:
                </span>
                {summary.infrastructureReviewSummary?.inspectionTriggerReasons?.length > 0 && (
                  <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: 'var(--font-size-xs)', color: '#92400E' }}>
                    {summary.infrastructureReviewSummary.inspectionTriggerReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Regulatory rule set citation */}
          {regulatoryCompliance && (
            <div
              style={{
                marginTop: 'var(--space-3)',
                paddingTop: 'var(--space-2)',
                borderTop: '1px solid var(--color-border-subtle)',
                fontSize: '11px',
                color: 'var(--color-muted-foreground)',
              }}
            >
              Evaluated against:{' '}
              <strong style={{ color: 'var(--color-foreground)' }}>
                {regulatoryCompliance.ruleSetName || regulatoryCompliance.ruleSetCode || 'AICTE Approval Process Handbook'}
              </strong>{' '}
              (Version: {String(regulatoryCompliance.ruleVersionNumber || '1.0.0')})
            </div>
          )}
        </CardContent>
      </Card>

      {/* Findings List Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-muted-foreground)' }}>
            Severity Filter:
          </span>
          <Button
            type="button"
            variant={severityFilter === 'ALL' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSeverityFilter('ALL')}
          >
            All ({findings.length})
          </Button>
          <Button
            type="button"
            variant={severityFilter === 'CRITICAL' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSeverityFilter('CRITICAL')}
          >
            Critical ({summary.criticalDeficienciesCount})
          </Button>
          <Button
            type="button"
            variant={severityFilter === 'ADVISORY' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSeverityFilter('ADVISORY')}
          >
            Advisory ({summary.advisoryFlagsCount})
          </Button>
          <Button
            type="button"
            variant={severityFilter === 'COMPLIANT' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSeverityFilter('COMPLIANT')}
          >
            Compliant ({summary.compliantCount})
          </Button>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <label htmlFor="finding-category-filter" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}>
              Category:
            </label>
            <select
              id="finding-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="scrutiny-filter-select"
              style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)' }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Findings Cards */}
      <div role="region" aria-label="Dossier findings list">
        {filteredFindings.length === 0 ? (
          <Card>
            <CardContent style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted-foreground)' }}>
              No findings match your current filter criteria.
            </CardContent>
          </Card>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = !!expandedFindings[finding.id];
            const cardClass =
              finding.severity === 'CRITICAL_DEFICIENCY'
                ? 'finding-card finding-card-critical'
                : finding.severity === 'ADVISORY_FLAG'
                  ? 'finding-card finding-card-advisory'
                  : 'finding-card finding-card-compliant';

            return (
              <div key={finding.id} className={cardClass}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                      {finding.severity === 'CRITICAL_DEFICIENCY' && (
                        <Badge variant="error">Critical Deficiency</Badge>
                      )}
                      {finding.severity === 'ADVISORY_FLAG' && (
                        <Badge variant="warning">Advisory Flag</Badge>
                      )}
                      {finding.severity === 'COMPLIANT' && (
                        <Badge variant="success">Compliant</Badge>
                      )}

                      <span
                        style={{
                          fontFamily: 'var(--font-family-mono, monospace)',
                          fontSize: '11px',
                          color: 'var(--color-muted-foreground)',
                        }}
                      >
                        {finding.ruleCode}
                      </span>

                      <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)' }}>
                        • {finding.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 style={{ margin: 'var(--space-1) 0', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                      {finding.ruleDescription}
                    </h4>

                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-foreground)' }}>
                      {finding.message}
                    </p>

                    {/* Value comparison if present */}
                    {(finding.expectedValue !== undefined || finding.actualValue !== undefined) && (
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-1) var(--space-2)',
                          backgroundColor: 'var(--color-background)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                        }}
                      >
                        {finding.expectedValue !== undefined && (
                          <span>
                            Expected: <strong>{String(finding.expectedValue)}</strong>
                          </span>
                        )}
                        {finding.actualValue !== undefined && (
                          <span>
                            Actual: <strong style={{ color: finding.severity === 'CRITICAL_DEFICIENCY' ? 'var(--color-error)' : 'inherit' }}>{String(finding.actualValue)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                    {finding.documentId && onSelectDocument && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectDocument(finding.documentId!)}
                        title="Jump to associated document in verification matrix"
                      >
                        <ExternalLink size={13} aria-hidden="true" />
                        <span>Inspect Doc</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(finding.id)}
                      aria-label={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 'var(--space-3)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--color-border-subtle)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
                      {finding.documentId && (
                        <div>
                          <span style={{ color: 'var(--color-muted-foreground)', display: 'block' }}>Document Attachment UUID:</span>
                          <span style={{ fontFamily: 'var(--font-family-mono, monospace)' }}>{finding.documentId}</span>
                        </div>
                      )}

                      {finding.fieldKey && (
                        <div>
                          <span style={{ color: 'var(--color-muted-foreground)', display: 'block' }}>Evaluated Field:</span>
                          <span style={{ fontWeight: 500 }}>{finding.fieldKey}</span>
                        </div>
                      )}

                      {finding.boundingLocation && (
                        <div>
                          <span style={{ color: 'var(--color-muted-foreground)', display: 'block' }}>OCR Bounding Box:</span>
                          <span style={{ fontFamily: 'var(--font-family-mono, monospace)' }}>
                            Page {finding.boundingLocation.pageNumber} [{Math.round(finding.boundingLocation.x * 100)}%, {Math.round(finding.boundingLocation.y * 100)}%]
                          </span>
                        </div>
                      )}

                      <div>
                        <span style={{ color: 'var(--color-muted-foreground)', display: 'block' }}>Legal Policy:</span>
                        <span>ADR-004 Human Sovereignty (Advisory finding only)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
