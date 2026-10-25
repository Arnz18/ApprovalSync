import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  Clock,
  Building,
  CheckCircle2,
  FileCheck2,
  Info,
} from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Loading';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { CaseHeader } from '../components/scrutiny/CaseHeader';
import { ApplicationDataTab } from '../components/scrutiny/ApplicationDataTab';
import { CaseTimelineView } from '../components/scrutiny/CaseTimelineView';
import { DossierFindingsView } from '../components/scrutiny/DossierFindingsView';
import { DocumentVerificationMatrixView } from '../components/scrutiny/DocumentVerificationMatrixView';
import { scrutinyService } from '../api/services/scrutinyService';
import { workflowService } from '../api/services/workflowService';
import { dossierService } from '../api/services/dossierService';
import { ApplicationProjection } from '../applications/types';
import {
  WorkflowTimelineEvent,
  DossierReport,
  AllowedTransition,
} from '../scrutiny/types';
import { ApiClientError } from '../api/client';

export type CaseDetailTab = 'dossier' | 'matrix' | 'application' | 'timeline';

export const CaseDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<CaseDetailTab>('dossier');

  // Application state
  const [application, setApplication] = useState<ApplicationProjection | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<WorkflowTimelineEvent[]>([]);
  const [dossierReport, setDossierReport] = useState<DossierReport | null>(null);
  const [allowedTransitions, setAllowedTransitions] = useState<AllowedTransition[]>([]);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDossierLoading, setIsDossierLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [forbidden, setForbidden] = useState<boolean>(false);

  const fetchCaseData = useCallback(async () => {
    if (!applicationId) return;

    setIsLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);

    try {
      // 1. Fetch application details
      const app = await scrutinyService.getCaseDetails(applicationId);
      setApplication(app);

      // 2. Fetch timeline events
      try {
        const timelineRes = await workflowService.getTimeline(applicationId, {
          limit: 100,
          sortOrder: 'DESC',
        });
        setTimelineEvents(timelineRes.items);
      } catch {
        // timeline failure is non-fatal
      }

      // 3. Fetch allowed transitions
      try {
        const allowed = await workflowService.getAllowedTransitions(applicationId);
        setAllowedTransitions(allowed);
      } catch {
        // non-fatal
      }

      // 4. Fetch cached dossier report if submitted
      if (app.status !== 'DRAFT') {
        setIsDossierLoading(true);
        try {
          const report = await dossierService.getDossierReport(applicationId);
          setDossierReport(report);
        } catch {
          // non-fatal: can still evaluate explicitly
        } finally {
          setIsDossierLoading(false);
        }
      }

      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiClientError) {
        if (err.statusCode === 404) {
          setNotFound(true);
        } else if (err.statusCode === 403) {
          setForbidden(true);
        } else {
          setError(err.message || 'Failed to load application case details.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error communicating with the server.');
      }
    }
  }, [applicationId]);

  useEffect(() => {
    fetchCaseData();
  }, [fetchCaseData]);

  if (notFound) {
    return (
      <div style={{ padding: 'var(--space-8) 0' }}>
        <EmptyState
          icon={<FileText size={48} />}
          title="Application Case Not Found"
          description={`No application record was found matching ID "${applicationId}". The application may have been withdrawn or does not exist.`}
          action={
            <Button type="button" variant="primary" onClick={() => navigate('/scrutiny')}>
              Return to Scrutiny Queue
            </Button>
          }
        />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div style={{ padding: 'var(--space-8) 0' }}>
        <Alert variant="error" title="Access Forbidden">
          <div>
            You do not have permission to view this application case. Institutional users are
            strictly isolated to their own institution records under multi-tenant security
            boundaries.
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/scrutiny')}>
              Return to Scrutiny Queue
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (isLoading && !application) {
    return (
      <div style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <Spinner size="lg" label="Loading application case file and verification records..." />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div style={{ padding: 'var(--space-8) 0' }}>
        <Alert variant="error" title="Failed to Load Case">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button type="button" variant="primary" size="sm" onClick={fetchCaseData}>
              Retry Load
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const handleReevaluateDossier = async () => {
    if (!applicationId) return;
    setIsDossierLoading(true);
    setError(null);
    try {
      const report = await dossierService.evaluateDossier(applicationId);
      setDossierReport(report);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Dossier evaluation failed: ${err.message}`);
      } else {
        setError('Failed to re-evaluate dossier verification report.');
      }
    } finally {
      setIsDossierLoading(false);
    }
  };

  const handleJumpToDocument = (_documentId: string) => {
    setActiveTab('matrix');
  };

  if (!application) return null;

  return (
    <div className="case-detail-page" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Case Header */}
      <CaseHeader
        application={application}
        onRefresh={fetchCaseData}
        isLoading={isLoading}
      />

      {/* ADR-004 Human Sovereignty Legal Disclaimer */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Alert variant="info" title="ADR-004 Human Sovereignty Advisory Boundary">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              {dossierReport?.disclaimer ||
                'This automated dossier verification report provides advisory decision support for AICTE scrutiny officers and EVC committee members. It does not constitute statutory approval, endorsement, or rejection of any application. All findings, discrepancies, and anomaly indicators must be reviewed, corroborated, and decided by authorized human evaluators in accordance with the AICTE Approval Process Handbook.'}
            </span>
          </div>
        </Alert>
      </div>

      {/* Workflow Transition Availability Badge Strip */}
      {allowedTransitions.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>
            Permitted Review Transitions ({allowedTransitions.length}):
          </span>
          {allowedTransitions.map((t) => (
            <span
              key={t.toStatus}
              style={{
                padding: '2px 8px',
                backgroundColor: 'var(--color-muted)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                color: 'var(--color-foreground)',
              }}
            >
              {t.toStatus}
            </span>
          ))}
        </div>
      )}

      {/* Tab Navigation Controls */}
      <div
        role="tablist"
        aria-label="Case inspection sections"
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'dossier'}
          onClick={() => setActiveTab('dossier')}
          className={`btn btn-ghost ${activeTab === 'dossier' ? 'btn-primary' : ''}`}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'dossier' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>Dossier Findings & AI Synthesis</span>
          {dossierReport?.summary?.criticalDeficienciesCount ? (
            <span
              style={{
                backgroundColor: 'var(--color-error)',
                color: '#fff',
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '999px',
                fontWeight: 700,
                marginLeft: '4px',
              }}
            >
              {dossierReport.summary.criticalDeficienciesCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'matrix'}
          onClick={() => setActiveTab('matrix')}
          className={`btn btn-ghost ${activeTab === 'matrix' ? 'btn-primary' : ''}`}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'matrix' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          <FileCheck2 size={15} aria-hidden="true" />
          <span>Document Verification Matrix</span>
          {dossierReport?.documentMatrix ? (
            <span
              style={{
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '999px',
                fontWeight: 600,
                marginLeft: '4px',
              }}
            >
              {dossierReport.documentMatrix.length}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'application'}
          onClick={() => setActiveTab('application')}
          className={`btn btn-ghost ${activeTab === 'application' ? 'btn-primary' : ''}`}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'application' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          <Building size={15} aria-hidden="true" />
          <span>Application Metrics & Facilities</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
          className={`btn btn-ghost ${activeTab === 'timeline' ? 'btn-primary' : ''}`}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'timeline' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          <Clock size={15} aria-hidden="true" />
          <span>Case Timeline & History</span>
          <span
            style={{
              backgroundColor: 'var(--color-muted)',
              color: 'var(--color-foreground)',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              fontWeight: 600,
              marginLeft: '4px',
            }}
          >
            {timelineEvents.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'application' && (
          <ApplicationDataTab application={application} />
        )}

        {activeTab === 'timeline' && (
          <CaseTimelineView
            events={timelineEvents}
            isLoading={isLoading}
            onRefresh={fetchCaseData}
          />
        )}

        {activeTab === 'dossier' && (
          <DossierFindingsView
            dossierReport={dossierReport}
            isLoading={isDossierLoading}
            onEvaluate={handleReevaluateDossier}
            onSelectDocument={handleJumpToDocument}
          />
        )}

        {activeTab === 'matrix' && (
          <DocumentVerificationMatrixView
            documents={dossierReport?.documentMatrix || []}
            onSelectDocumentFinding={(_docId) => {
              setActiveTab('dossier');
            }}
          />
        )}
      </div>
    </div>
  );
};
