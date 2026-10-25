/**
 * ApprovalSync — Wizard Step 5: Submission Confirmation & Receipt
 * Milestone: FE-03
 * Confirms atomic transition to SUBMITTED status and displays assigned applicationNumber.
 * Enforces Human Sovereignty (ADR-004): explains documentary scrutiny pipeline.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileCheck, Printer, Home, ShieldCheck, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, ApplicationStatusBadge } from '../ui/Badge';
import { ApplicationWizardState } from '../../applications/types';

export interface SubmissionConfirmationStepProps {
  state: ApplicationWizardState;
}

export function SubmissionConfirmationStep({
  state,
}: SubmissionConfirmationStepProps): React.ReactElement {
  const navigate = useNavigate();

  const formattedDate = state.submittedAt
    ? new Date(state.submittedAt).toLocaleString('en-IN', {
        dateStyle: 'long',
        timeStyle: 'medium',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'long',
        timeStyle: 'medium',
      });

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Success Hero Banner */}
      <div className="text-center p-8 bg-surface rounded-xl border border-success-border shadow-xs">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-bg text-success mb-4 ring-8 ring-success-bg/50">
          <CheckCircle size={36} />
        </div>
        <h2 className="text-2xl font-bold font-heading text-foreground mb-2">
          Application Submitted Successfully
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Your application has been cryptographically sealed, assigned a regulatory reference
          identifier, and queued for documentary scrutiny.
        </p>
      </div>

      {/* Submission Receipt Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck size={20} className="text-primary" />
              <div>
                <CardTitle>Official Submission Receipt</CardTitle>
                <CardDescription>
                  Keep this application reference for all official communications with AICTE.
                </CardDescription>
              </div>
            </div>
            <ApplicationStatusBadge status="SUBMITTED" />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted p-5 rounded-lg border border-border-subtle">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Application Reference Number
              </dt>
              <dd className="font-mono text-base font-bold text-primary mt-0.5">
                {state.applicationNumber || 'APP-2026-SUBMITTED'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Submission Timestamp
              </dt>
              <dd className="font-medium text-foreground mt-0.5">{formattedDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Academic Approval Session
              </dt>
              <dd className="font-medium text-foreground mt-0.5">{state.academicYear}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Curriculum Stream
              </dt>
              <dd className="font-medium text-foreground mt-0.5">{state.programType}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Attached Statutory Documents
              </dt>
              <dd className="font-medium text-foreground mt-0.5">
                {state.uploadedDocuments.length} Verified Attachments
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">
                Lifecycle State
              </dt>
              <dd className="mt-0.5">
                <Badge variant="info" icon={<ShieldCheck size={12} />}>
                  SUBMITTED (Locked for Scrutiny)
                </Badge>
              </dd>
            </div>
          </dl>

          {/* Regulatory Scrutiny Process Walkthrough (ADR-004 Human Sovereignty) */}
          <div className="mt-6 p-4 rounded-lg bg-info-bg border border-info-border text-on-info text-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-info">
              <Eye size={16} />
              <span>Next Steps: Regulatory Scrutiny & Evaluation Workflow</span>
            </div>
            <p className="leading-relaxed">
              In accordance with AICTE governance norms and the ApprovalSync Human Sovereignty
              principle (ADR-004):
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>
                <strong>Automated Document AI Analysis:</strong> Your documents are processed for
                OCR extraction, cross-record consistency, and duplicate detection. AI findings
                provide advisory assistance to scrutiny officers.
              </li>
              <li>
                <strong>Human Scrutiny Officer Evaluation:</strong> An authorized AICTE Scrutiny
                Officer reviews your dossier. AI flags never trigger automated rejection or
                approval.
              </li>
              <li>
                <strong>Deficiency Notice / Clarification:</strong> If any documentary deficiency or
                ambiguity is identified, a formal deficiency notice will be issued to your
                institutional portal for response.
              </li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <Button
            type="button"
            variant="outline"
            leftIcon={<Printer size={16} />}
            onClick={() => window.print()}
          >
            Print Receipt
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Home size={16} />}
            onClick={() => navigate('/')}
          >
            Return to Workspace Overview
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
