/**
 * ApprovalSync — Institution Application Wizard Page
 * Milestone: FE-03
 * Main page coordinating application intake, draft persistence, document attachments,
 * validation error summaries, and atomic submission.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Loading';
import { WizardStepper } from '../components/wizard/WizardStepper';
import { InstitutionStep } from '../components/wizard/InstitutionStep';
import { FacilitiesStep } from '../components/wizard/FacilitiesStep';
import { DocumentUploadStep } from '../components/wizard/DocumentUploadStep';
import { ReviewSubmitStep } from '../components/wizard/ReviewSubmitStep';
import { SubmissionConfirmationStep } from '../components/wizard/SubmissionConfirmationStep';
import {
  ApplicationWizardState,
  INITIAL_WIZARD_STATE,
  WizardStep,
  ApplicationProjection,
  DocumentMetadataProjection,
} from '../applications/types';
import {
  validateInstitutionStep,
  validateFacilitiesStep,
  validateDocumentsStep,
  validateReviewStep,
} from '../applications/validation';
import { applicationsService } from '../api/services/applicationsService';
import { ApiClientError } from '../api/client';

export function ApplicationWizardPage(): React.ReactElement {
  const [state, setState] = useState<ApplicationWizardState>(INITIAL_WIZARD_STATE);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeErrors, setActiveErrors] = useState<Record<string, string>>({});
  const [topErrorList, setTopErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  // Load existing draft if present for current institution user
  useEffect(() => {
    let isMounted = true;

    async function loadExistingDraft() {
      try {
        setInitialLoading(true);
        const listRes = await applicationsService.listApplications({
          status: 'DRAFT',
          limit: 1,
        });

        if (isMounted && listRes.items && listRes.items.length > 0) {
          const draft: ApplicationProjection = listRes.items[0];

          // Fetch attached documents for this draft
          let docs: DocumentMetadataProjection[] = [];
          try {
            docs = await applicationsService.getApplicationDocuments(draft.id);
          } catch {
            docs = [];
          }

          if (isMounted) {
            const payload = draft.payloadJsonb || {};
            setState((prev) => ({
              ...prev,
              applicationId: draft.id,
              applicationNumber: draft.applicationNumber,
              academicYear: draft.academicYear || prev.academicYear,
              programType: draft.programType || prev.programType,
              facultyCount:
                typeof payload.facultyCount === 'number' ? payload.facultyCount : prev.facultyCount,
              landAreaAcres:
                typeof payload.landAreaAcres === 'number'
                  ? payload.landAreaAcres
                  : prev.landAreaAcres,
              builtUpAreaSqMeters:
                typeof payload.builtUpAreaSqMeters === 'number'
                  ? payload.builtUpAreaSqMeters
                  : prev.builtUpAreaSqMeters,
              libraryBooksCount:
                typeof payload.libraryBooksCount === 'number'
                  ? payload.libraryBooksCount
                  : prev.libraryBooksCount,
              laboratoryCount:
                typeof payload.laboratoryCount === 'number'
                  ? payload.laboratoryCount
                  : prev.laboratoryCount,
              coursesProposed: Array.isArray(payload.coursesProposed)
                ? (payload.coursesProposed as string[])
                : prev.coursesProposed,
              uploadedDocuments: docs,
              saveStatus: 'saved',
              lastSavedAt: draft.updatedAt,
            }));
          }
        }
      } catch (err) {
        // Failing to list drafts is non-fatal: user can start a fresh draft
        console.warn('Could not load existing drafts:', err);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    loadExistingDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateFields = (fields: Partial<ApplicationWizardState>) => {
    setState((prev) => ({
      ...prev,
      ...fields,
      saveStatus: 'idle',
    }));
    // Clear active error for updated fields
    if (Object.keys(activeErrors).length > 0) {
      const updated = { ...activeErrors };
      Object.keys(fields).forEach((k) => delete updated[k]);
      setActiveErrors(updated);
      setTopErrorList(Object.entries(updated).map(([field, message]) => ({ field, message })));
    }
  };

  /**
   * Save or update draft on backend
   */
  const ensureDraftSaved = async (): Promise<string> => {
    setState((prev) => ({ ...prev, saveStatus: 'saving' }));

    const payloadJsonb: Record<string, unknown> = {
      facultyCount: state.facultyCount !== '' ? Number(state.facultyCount) : 0,
      landAreaAcres: state.landAreaAcres !== '' ? Number(state.landAreaAcres) : 0,
      builtUpAreaSqMeters: state.builtUpAreaSqMeters !== '' ? Number(state.builtUpAreaSqMeters) : 0,
      libraryBooksCount: state.libraryBooksCount !== '' ? Number(state.libraryBooksCount) : 0,
      laboratoryCount: state.laboratoryCount !== '' ? Number(state.laboratoryCount) : 0,
      coursesProposed: state.coursesProposed,
    };

    try {
      if (state.applicationId) {
        // Update existing draft
        const updated = await applicationsService.updateDraft(state.applicationId, {
          academicYear: state.academicYear,
          programType: state.programType,
          payloadJsonb,
        });

        setState((prev) => ({
          ...prev,
          saveStatus: 'saved',
          lastSavedAt: updated.updatedAt,
        }));
        return updated.id;
      } else {
        // Create new draft
        const created = await applicationsService.createDraft({
          academicYear: state.academicYear,
          programType: state.programType,
          payloadJsonb,
        });

        setState((prev) => ({
          ...prev,
          applicationId: created.id,
          applicationNumber: created.applicationNumber,
          saveStatus: 'saved',
          lastSavedAt: created.updatedAt,
        }));
        return created.id;
      }
    } catch (err: unknown) {
      let msg = 'Failed to save draft to server.';
      if (err instanceof ApiClientError) {
        msg = err.message;
      }
      setState((prev) => ({ ...prev, saveStatus: 'error', errorMessage: msg }));
      throw err;
    }
  };

  /**
   * Validate current step and advance to next
   */
  const handleNextStep = async () => {
    let result = {
      isValid: true,
      errors: {},
      errorList: [] as Array<{ field: string; message: string }>,
    };

    if (state.currentStep === WizardStep.INSTITUTION_INFO) {
      result = validateInstitutionStep(state);
    } else if (state.currentStep === WizardStep.PROGRAM_FACILITIES) {
      result = validateFacilitiesStep(state);
    } else if (state.currentStep === WizardStep.DOCUMENT_UPLOAD) {
      result = validateDocumentsStep(state);
    }

    if (!result.isValid) {
      setActiveErrors(result.errors);
      setTopErrorList(result.errorList);
      // Move focus to top error summary per ui-ux-pro-max
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
      return;
    }

    // Step is valid: clear errors and persist draft
    setActiveErrors({});
    setTopErrorList([]);

    try {
      await ensureDraftSaved();
      const nextStep = (state.currentStep + 1) as WizardStep;
      setState((prev) => ({
        ...prev,
        currentStep: nextStep,
        highestVisitedStep: Math.max(prev.highestVisitedStep, nextStep) as WizardStep,
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Auto-save on step advance failed:', err);
    }
  };

  const handleBackStep = () => {
    setActiveErrors({});
    setTopErrorList([]);
    const prevStep = Math.max(WizardStep.INSTITUTION_INFO, state.currentStep - 1) as WizardStep;
    setState((prev) => ({
      ...prev,
      currentStep: prevStep,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (step: WizardStep) => {
    setActiveErrors({});
    setTopErrorList([]);
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Final atomic submission to BE-04
   */
  const handleSubmitApplication = async () => {
    const reviewResult = validateReviewStep(state);
    if (!reviewResult.isValid) {
      setActiveErrors(reviewResult.errors);
      setTopErrorList(reviewResult.errorList);
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, errorMessage: undefined }));

    try {
      // 1. Ensure latest fields are saved to draft first
      const appId = await ensureDraftSaved();

      // 2. Submit application atomically (POST /api/v1/applications/:id/submit)
      const submitted = await applicationsService.submitApplication(appId);

      // 3. Update state to confirmed
      setState((prev) => ({
        ...prev,
        currentStep: WizardStep.CONFIRMATION,
        highestVisitedStep: WizardStep.CONFIRMATION,
        status: submitted.status,
        submittedAt: submitted.submittedAt,
        applicationNumber: submitted.applicationNumber,
        isSubmitting: false,
        saveStatus: 'saved',
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      let msg = 'Failed to submit application. Please review and try again.';
      if (err instanceof ApiClientError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        errorMessage: msg,
      }));
      setActiveErrors({ submission: msg });
      setTopErrorList([{ field: 'submission', message: msg }]);
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
    }
  };

  if (initialLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" label="Loading application intake workspace and drafts..." />
        <span className="text-sm text-muted-foreground">
          Loading application intake workspace and drafts...
        </span>
      </div>
    );
  }

  return (
    <div className="wizard-page-container max-w-5xl mx-auto px-4 py-6">
      {/* Page Header */}
      <PageHeader
        title="Institution Application Intake Wizard"
        description="Statutory accreditation & regulatory approval intake workflow under AICTE Approval Process Handbook (APH)."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Applications', href: '/applications' },
        ]}
        actions={
          state.currentStep !== WizardStep.CONFIRMATION ? (
            <div className="flex items-center gap-3">
              {state.saveStatus === 'saving' && (
                <Badge variant="info">
                  <span className="spinner mr-1" /> Saving Draft...
                </Badge>
              )}
              {state.saveStatus === 'saved' && (
                <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                  {state.applicationNumber ? `Draft: ${state.applicationNumber}` : 'Draft Saved'}
                </Badge>
              )}
              {state.saveStatus === 'idle' && state.applicationId && (
                <Badge variant="default">Unsaved Local Edits</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Save size={14} />}
                onClick={() => ensureDraftSaved()}
                disabled={state.saveStatus === 'saving' || state.isSubmitting}
              >
                Save Draft
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Wizard Progress Stepper */}
      <WizardStepper
        currentStep={state.currentStep}
        highestVisitedStep={state.highestVisitedStep}
        onStepClick={handleStepClick}
        isSubmitting={state.isSubmitting}
      />

      {/* Focusable Error Summary (ui-ux-pro-max guideline) */}
      {topErrorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="error-summary-title"
          className="mb-6 p-4 rounded-lg bg-error-bg border border-error-border text-on-error focus:outline-hidden focus:ring-2 focus:ring-error"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 text-error flex-shrink-0" />
            <div>
              <h3 id="error-summary-title" className="font-semibold text-sm mb-1">
                There is a problem with the information entered ({topErrorList.length} error
                {topErrorList.length > 1 ? 's' : ''}):
              </h3>
              <ul className="list-disc list-inside text-xs space-y-1 font-medium">
                {topErrorList.map((err, idx) => (
                  <li key={idx}>
                    <a
                      href={`#${err.field}`}
                      className="underline hover:text-error focus:ring-1 focus:ring-error rounded"
                    >
                      {err.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step Renderers */}
      {state.currentStep === WizardStep.INSTITUTION_INFO && (
        <InstitutionStep
          state={state}
          onChange={updateFields}
          onNext={handleNextStep}
          errors={activeErrors}
          isSaving={state.saveStatus === 'saving'}
        />
      )}

      {state.currentStep === WizardStep.PROGRAM_FACILITIES && (
        <FacilitiesStep
          state={state}
          onChange={updateFields}
          onNext={handleNextStep}
          onBack={handleBackStep}
          errors={activeErrors}
          isSaving={state.saveStatus === 'saving'}
        />
      )}

      {state.currentStep === WizardStep.DOCUMENT_UPLOAD && (
        <DocumentUploadStep
          state={state}
          onChange={updateFields}
          onNext={handleNextStep}
          onBack={handleBackStep}
          onEnsureDraftSaved={ensureDraftSaved}
          errors={activeErrors}
          isSaving={state.saveStatus === 'saving'}
        />
      )}

      {state.currentStep === WizardStep.REVIEW_SUBMIT && (
        <ReviewSubmitStep
          state={state}
          onChange={updateFields}
          onGoToStep={handleStepClick}
          onSubmit={handleSubmitApplication}
          onBack={handleBackStep}
          errors={activeErrors}
          isSubmitting={state.isSubmitting}
        />
      )}

      {state.currentStep === WizardStep.CONFIRMATION && (
        <SubmissionConfirmationStep state={state} />
      )}
    </div>
  );
}
