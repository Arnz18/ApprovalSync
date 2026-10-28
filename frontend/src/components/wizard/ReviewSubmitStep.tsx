/**
 * ApprovalSync — Wizard Step 4: Review & Statutory Submission
 * Milestone: FE-03
 * Summarizes all entered metrics, documents, and collects statutory oath declaration.
 * Submits application to BE-04: POST /api/v1/applications/:id/submit.
 */

import React from 'react';
import {
  FileText,
  AlertTriangle,
  Building2,
  Layers,
  CheckCircle2,
  Edit3,
  Scale,
  Send,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ApplicationWizardState,
  WizardStep,
  resolveCategoryKey,
  CATEGORY_REQUIREMENTS,
} from '../../applications/types';
import { formatBytes } from './DocumentUploadStep';

export interface ReviewSubmitStepProps {
  state: ApplicationWizardState;
  onChange: (fields: Partial<ApplicationWizardState>) => void;
  onGoToStep: (step: WizardStep) => void;
  onSubmit: () => void;
  onBack: () => void;
  errors: Record<string, string>;
  isSubmitting?: boolean;
}

export function ReviewSubmitStep({
  state,
  onChange,
  onGoToStep,
  onSubmit,
  onBack,
  errors,
  isSubmitting = false,
}: ReviewSubmitStepProps): React.ReactElement {
  const categoryKey = resolveCategoryKey(state.programType);
  const requirements =
    CATEGORY_REQUIREMENTS[categoryKey] || CATEGORY_REQUIREMENTS.GENERAL_TECHNICAL_INSTITUTION;

  const uploadedDocsByType = React.useMemo(() => {
    const map = new Map();
    state.uploadedDocuments.forEach((doc) => map.set(doc.documentType, doc));
    return map;
  }, [state.uploadedDocuments]);

  const missingMandatory = requirements.filter(
    (req) => req.isMandatory && !uploadedDocsByType.has(req.documentType),
  );

  const canSubmit = state.declarationAccepted && missingMandatory.length === 0 && !isSubmitting;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="wizard-step-form">
      {/* Missing mandatory evidence warning */}
      {missingMandatory.length > 0 && (
        <div
          className="mb-6 p-4 rounded-lg bg-error-bg border border-error-border text-on-error flex items-start gap-3"
          role="alert"
        >
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-error" />
          <div className="text-sm">
            <h4 className="font-semibold mb-1">
              Submission Blocked: Missing Mandatory Statutory Evidence
            </h4>
            <p className="text-xs mb-2">
              The following required documents must be uploaded before regulatory submission:
            </p>
            <ul className="list-disc list-inside text-xs space-y-0.5 font-medium">
              {missingMandatory.map((m) => (
                <li key={m.documentType}>
                  {m.displayName} ({m.documentType})
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 bg-surface text-error border-error-border hover:bg-error-bg"
              onClick={() => onGoToStep(WizardStep.DOCUMENT_UPLOAD)}
            >
              ← Return to Document Upload
            </Button>
          </div>
        </div>
      )}

      {/* Review Section 1: Institution & Program */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-primary" />
            <CardTitle className="text-base">1. Institution & Program Details</CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Edit3 size={14} />}
            onClick={() => onGoToStep(WizardStep.INSTITUTION_INFO)}
            disabled={isSubmitting}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted p-4 rounded border border-border-subtle">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Academic Year
              </dt>
              <dd className="font-medium text-foreground">{state.academicYear || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Program Stream
              </dt>
              <dd className="font-medium text-foreground">{state.programType || 'Not set'}</dd>
            </div>
            {state.applicationNumber && (
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-semibold">
                  Application Draft ID
                </dt>
                <dd className="font-mono text-xs font-semibold text-secondary">
                  {state.applicationNumber}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Review Section 2: Facilities & Infrastructure */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <Layers size={18} className="text-primary" />
            <CardTitle className="text-base">2. Infrastructure & Capacity Metrics</CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Edit3 size={14} />}
            onClick={() => onGoToStep(WizardStep.PROGRAM_FACILITIES)}
            disabled={isSubmitting}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-muted p-4 rounded border border-border-subtle">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Campus Land Area
              </dt>
              <dd className="font-medium text-foreground">{state.landAreaAcres} Acres</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Built-Up Area
              </dt>
              <dd className="font-medium text-foreground">
                {state.builtUpAreaSqMeters} Sq. Meters
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Faculty Strength
              </dt>
              <dd className="font-medium text-foreground">{state.facultyCount} Members</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Library Titles/Volumes
              </dt>
              <dd className="font-medium text-foreground">{state.libraryBooksCount} Books</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Laboratories
              </dt>
              <dd className="font-medium text-foreground">{state.laboratoryCount} Labs</dd>
            </div>
          </dl>

          <div>
            <span className="text-xs text-muted-foreground uppercase font-semibold block mb-2">
              Proposed Courses & Sanctioned Intake
            </span>
            <ul className="list-disc list-inside text-sm space-y-1 text-foreground pl-1">
              {state.coursesProposed.map((course, idx) => (
                <li key={idx} className="font-medium">
                  {course}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Review Section 3: Uploaded Evidence */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-primary" />
            <CardTitle className="text-base">3. Uploaded Statutory Documents</CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Edit3 size={14} />}
            onClick={() => onGoToStep(WizardStep.DOCUMENT_UPLOAD)}
            disabled={isSubmitting}
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {state.uploadedDocuments.length === 0 ? (
            <p className="text-sm text-error font-medium">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {state.uploadedDocuments.map((doc) => {
                const req = requirements.find((r) => r.documentType === doc.documentType);
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-muted border border-border-subtle text-xs gap-2"
                  >
                    <div>
                      <span className="font-semibold text-foreground text-sm block">
                        {req?.displayName || doc.documentType}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {doc.fileName} • {formatBytes(doc.fileSizeBytes)}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                        Stored ({doc.processingStatus})
                      </Badge>
                      <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                        SHA256: {doc.sha256Checksum?.slice(0, 16)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statutory Oath & Declaration Card */}
      <Card className="mb-6 border-primary/40 bg-info-bg/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Scale size={20} className="text-primary" />
            <div>
              <CardTitle>Statutory Oath & Regulatory Declaration</CardTitle>
              <CardDescription>
                Affirm under statutory penalty the truthfulness of submitted records.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded bg-surface border border-border-subtle mb-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-2">
              <strong>Statutory Declaration under AICTE Act & Regulations:</strong>
            </p>
            <p>
              I hereby solemnly affirm that the institution satisfies all mandatory land, built-up
              space, faculty, instructional, and financial norms set forth in the current AICTE
              Approval Process Handbook (APH 2024-27). All uploaded documents are genuine, unaltered
              copies of original statutory deeds, sanctioned municipal plans, and certificates
              issued by competent government authorities.
            </p>
            <p className="mt-2 text-error font-semibold">
              Warning: Any concealment, fabrication, or false representation will result in
              immediate cancellation of application, debarment of sponsoring Trust/Society, and
              penal proceedings.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.declarationAccepted}
              onChange={(e) => onChange({ declarationAccepted: e.target.checked })}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              required
            />
            <span className="text-sm font-medium text-foreground">
              I certify under statutory oath that all uploaded records, faculty metrics, and campus
              data are authentic, verifiable, and complete.
            </span>
          </label>

          {errors.declaration && (
            <p className="form-error mt-2" role="alert">
              {errors.declaration}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="wizard-nav-footer">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          ← Back to Documents
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={!canSubmit || isSubmitting}
          leftIcon={<Send size={16} />}
          className="min-w-[220px]"
        >
          {isSubmitting ? 'Sealing & Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </form>
  );
}
