import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Compass, ClipboardList, CalendarCheck, Users, History, Shield } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { EvcCaseHeader } from '../components/evc/EvcCaseHeader';
import { InfrastructureReviewView } from '../components/evc/InfrastructureReviewView';
import { InspectionChecklistEvidenceView } from '../components/evc/InspectionChecklistEvidenceView';
import { ExpertSchedulingView } from '../components/evc/ExpertSchedulingView';
import { CommitteeReviewView } from '../components/evc/CommitteeReviewView';
import { CaseTimelineView } from '../components/scrutiny/CaseTimelineView';
import { ReviewActionModal } from '../components/scrutiny/ReviewActionModal';
import { evcService } from '../api/services/evcService';
import { complianceService } from '../api/services/complianceService';
import { workflowService } from '../api/services/workflowService';
import { applicationsService } from '../api/services/applicationsService';
import { ApplicationProjection, DocumentMetadataProjection } from '../applications/types';
import { AllowedTransition, WorkflowTimelineEvent, ApplicationStatus } from '../scrutiny/types';
import { ComplianceAssessmentResult } from '../evc/types';
import { ApiClientError } from '../api/client';

export type EvcCaseTab =
  'INFRASTRUCTURE' | 'CHECKLIST_EVIDENCE' | 'SCHEDULING' | 'COMMITTEE' | 'TIMELINE';

export const EvcCaseDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<EvcCaseTab>('INFRASTRUCTURE');
  const [application, setApplication] = useState<ApplicationProjection | null>(null);
  const [compliance, setCompliance] = useState<ComplianceAssessmentResult | null>(null);
  const [allowedTransitions, setAllowedTransitions] = useState<AllowedTransition[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<WorkflowTimelineEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadataProjection[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [transitionSuccessMessage, setTransitionSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transition modal state
  const [selectedTransition, setSelectedTransition] = useState<AllowedTransition | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);

  const loadCaseData = useCallback(async () => {
    if (!applicationId) return;

    setIsLoading(true);
    setError(null);
    try {
      const [appData, allowedTrans, timelineData] = await Promise.all([
        evcService.getCaseDetails(applicationId),
        workflowService.getAllowedTransitions(applicationId).catch(() => []),
        workflowService.getTimeline(applicationId).catch(() => ({ items: [] })),
      ]);

      setApplication(appData);
      setAllowedTransitions(allowedTrans);
      setTimelineEvents(timelineData.items || []);

      // Fetch documents asynchronously
      setIsLoadingDocuments(true);
      applicationsService
        .getApplicationDocuments(applicationId)
        .then((docs) => setDocuments(docs))
        .catch(() => setDocuments([]))
        .finally(() => setIsLoadingDocuments(false));

      // Fetch compliance assessment asynchronously
      complianceService
        .getApplicationCompliance(applicationId)
        .then((compResult) => setCompliance(compResult))
        .catch((compErr) => {
          console.warn('Could not load compliance assist assessment:', compErr);
        });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 404) {
          setError('Application not found or inaccessible for the current user.');
        } else if (err.statusCode === 403) {
          setError('Access forbidden: Caller lacks permission to inspect this institutional case.');
        } else {
          setError(`Error loading application: ${err.message}`);
        }
      } else {
        setError('Network interruption or service failure while loading case.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  const handleReevaluateCompliance = async () => {
    if (!applicationId || isEvaluating) return;
    setIsEvaluating(true);
    setComplianceError(null);
    try {
      const compResult = await complianceService.evaluateCompliance(applicationId);
      setCompliance(compResult);
    } catch (err: unknown) {
      console.error('Failed to re-evaluate compliance assist:', err);
      setComplianceError(
        err instanceof Error
          ? err.message
          : 'Failed to re-evaluate compliance rules. Please check backend connectivity.',
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

  const handleOpenTransitionModal = (transition: AllowedTransition) => {
    setSelectedTransition(transition);
    setIsTransitionModalOpen(true);
  };

  const handleExecuteTransition = async (targetStatus: ApplicationStatus, comment?: string) => {
    if (!application) return;
    setIsSubmittingTransition(true);
    try {
      await workflowService.executeTransition(application.id, {
        targetStatus,
        comment,
      });
      setIsTransitionModalOpen(false);
      setSelectedTransition(null);
      setTransitionSuccessMessage(`Application transitioned to ${targetStatus} successfully.`);
      await loadCaseData();
    } catch (err) {
      console.error('Failed to execute workflow transition:', err);
      throw err;
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  if (isLoading && !application) {
    return (
      <div
        style={{
          padding: 'var(--space-12)',
          textAlign: 'center',
          color: 'var(--color-muted-foreground)',
        }}
      >
        <p>Loading application inspection workspace...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant="error" title="Workspace Access Error">
            <p>{error || 'Unable to open application inspection workspace.'}</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/evc')}>
                Return to EVC Queue
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="scrutiny-workspace-container" style={{ padding: 'var(--space-6)' }}>
      {transitionSuccessMessage && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert
            variant="success"
            title="Workflow Transition Recorded"
            onClose={() => setTransitionSuccessMessage(null)}
          >
            <p>{transitionSuccessMessage}</p>
          </Alert>
        </div>
      )}

      {complianceError && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert
            variant="error"
            title="Compliance Evaluation Issue"
            onClose={() => setComplianceError(null)}
          >
            <p>{complianceError}</p>
          </Alert>
        </div>
      )}

      {/* Case Header & Actions Bar */}
      <EvcCaseHeader
        application={application}
        compliance={compliance}
        allowedTransitions={allowedTransitions}
        onOpenTransitionModal={handleOpenTransitionModal}
        onReevaluateCompliance={handleReevaluateCompliance}
        isEvaluating={isEvaluating}
      />

      {/* ADR-004 Human Sovereignty Banner */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Alert
          variant="info"
          title="ADR-004 Human Sovereignty Governance: Advisory Decision Support"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Shield size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              All automated compliance heuristics, deficiency flags, and physical inspection
              recommendations are decision-support inputs only. Under AICTE regulatory statutes,
              automated outputs do not constitute final endorsement, approval, or rejection.
              Authoritative determinations rest exclusively with authorized Expert Visit Committee
              Members and Council Officers.
            </span>
          </div>
        </Alert>
      </div>

      {/* Workspace Tabs Navigation */}
      <div
        role="tablist"
        aria-label="EVC Workspace Tabs"
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-6)',
          overflowX: 'auto',
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'INFRASTRUCTURE'}
          onClick={() => setActiveTab('INFRASTRUCTURE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            border: 'none',
            borderBottom:
              activeTab === 'INFRASTRUCTURE'
                ? '3px solid var(--color-primary)'
                : '3px solid transparent',
            background: 'none',
            color:
              activeTab === 'INFRASTRUCTURE'
                ? 'var(--color-primary)'
                : 'var(--color-muted-foreground)',
            fontWeight:
              activeTab === 'INFRASTRUCTURE'
                ? 'var(--font-weight-bold)'
                : 'var(--font-weight-medium)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Compass size={16} aria-hidden="true" />
          <span>Infrastructure & Compliance (DOC-06)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'CHECKLIST_EVIDENCE'}
          onClick={() => setActiveTab('CHECKLIST_EVIDENCE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            border: 'none',
            borderBottom:
              activeTab === 'CHECKLIST_EVIDENCE'
                ? '3px solid var(--color-primary)'
                : '3px solid transparent',
            background: 'none',
            color:
              activeTab === 'CHECKLIST_EVIDENCE'
                ? 'var(--color-primary)'
                : 'var(--color-muted-foreground)',
            fontWeight:
              activeTab === 'CHECKLIST_EVIDENCE'
                ? 'var(--font-weight-bold)'
                : 'var(--font-weight-medium)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <ClipboardList size={16} aria-hidden="true" />
          <span>Inspection Checklist & Evidence Aid</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'SCHEDULING'}
          onClick={() => setActiveTab('SCHEDULING')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            border: 'none',
            borderBottom:
              activeTab === 'SCHEDULING'
                ? '3px solid var(--color-primary)'
                : '3px solid transparent',
            background: 'none',
            color:
              activeTab === 'SCHEDULING' ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            fontWeight:
              activeTab === 'SCHEDULING' ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <CalendarCheck size={16} aria-hidden="true" />
          <span>Expert Scheduling & Roster</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'COMMITTEE'}
          onClick={() => setActiveTab('COMMITTEE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            border: 'none',
            borderBottom:
              activeTab === 'COMMITTEE'
                ? '3px solid var(--color-primary)'
                : '3px solid transparent',
            background: 'none',
            color:
              activeTab === 'COMMITTEE' ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            fontWeight:
              activeTab === 'COMMITTEE' ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={16} aria-hidden="true" />
          <span>Committee Review & Hearing (SHC)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'TIMELINE'}
          onClick={() => setActiveTab('TIMELINE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            border: 'none',
            borderBottom:
              activeTab === 'TIMELINE' ? '3px solid var(--color-primary)' : '3px solid transparent',
            background: 'none',
            color:
              activeTab === 'TIMELINE' ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            fontWeight:
              activeTab === 'TIMELINE' ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <History size={16} aria-hidden="true" />
          <span>Audit Timeline (BE-06)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'INFRASTRUCTURE' && (
        <InfrastructureReviewView compliance={compliance} isLoading={isEvaluating} />
      )}

      {activeTab === 'CHECKLIST_EVIDENCE' && (
        <InspectionChecklistEvidenceView
          applicationId={application.id}
          documents={documents}
          isLoadingDocuments={isLoadingDocuments}
        />
      )}

      {activeTab === 'SCHEDULING' && (
        <ExpertSchedulingView application={application} compliance={compliance} />
      )}

      {activeTab === 'COMMITTEE' && (
        <CommitteeReviewView
          application={application}
          compliance={compliance}
          timelineEvents={timelineEvents}
          allowedTransitions={allowedTransitions}
          onOpenTransitionModal={(targetStatus) => {
            const trans = allowedTransitions.find((t) => t.toStatus === targetStatus);
            if (trans) handleOpenTransitionModal(trans);
          }}
        />
      )}

      {activeTab === 'TIMELINE' && (
        <CaseTimelineView events={timelineEvents} isLoading={isLoading} />
      )}

      {/* Transition Execution Modal */}
      {selectedTransition && (
        <ReviewActionModal
          isOpen={isTransitionModalOpen}
          transition={selectedTransition}
          applicationNumber={application.applicationNumber}
          onClose={() => {
            setIsTransitionModalOpen(false);
            setSelectedTransition(null);
          }}
          onSubmit={handleExecuteTransition}
          isSubmitting={isSubmittingTransition}
        />
      )}
    </div>
  );
};
