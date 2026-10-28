/**
 * ApprovalSync — Wizard Step 1: Institution & Academic Year
 * Milestone: FE-03
 */

import React, { useState } from 'react';
import { Building2, ShieldCheck, Info, Copy, Check } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { formatRoleName } from '../../auth/roleRoutes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { FormField, Input, Select } from '../ui/FormField';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ApplicationWizardState,
  PROGRAM_TYPES,
  resolveCategoryKey,
  CATEGORY_REQUIREMENTS,
} from '../../applications/types';

export interface InstitutionStepProps {
  state: ApplicationWizardState;
  onChange: (fields: Partial<ApplicationWizardState>) => void;
  onNext: () => void;
  errors: Record<string, string>;
  isSaving?: boolean;
}

export function InstitutionStep({
  state,
  onChange,
  onNext,
  errors,
  isSaving = false,
}: InstitutionStepProps): React.ReactElement {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(false);

  const categoryKey = resolveCategoryKey(state.programType);
  const requiredDocs =
    CATEGORY_REQUIREMENTS[categoryKey] || CATEGORY_REQUIREMENTS.GENERAL_TECHNICAL_INSTITUTION;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const handleCopyId = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="wizard-step-form">
      {/* Tenancy & Institutional Identity Card */}
      <Card className="mb-6 wizard-info-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="wizard-icon-box" aria-hidden="true">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <CardTitle>Institutional Tenancy Verification</CardTitle>
                <CardDescription>
                  This application is cryptographically sealed to your registered institution.
                </CardDescription>
              </div>
            </div>
            <Badge variant="success" icon={<ShieldCheck size={12} />}>
              Tenant Isolated
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="identity-summary-card">
            <dl className="identity-summary-grid">
              <div className="identity-summary-item">
                <dt className="identity-summary-label">Authorized Representative</dt>
                <dd className="identity-summary-value">{user?.name || 'Demo Representative'}</dd>
              </div>

              <div className="identity-summary-item">
                <dt className="identity-summary-label">Institutional Email</dt>
                <dd className="identity-summary-value">
                  {user?.email || 'representative@institution.ac.in'}
                </dd>
              </div>

              <div className="identity-summary-item">
                <dt className="identity-summary-label">Account Role</dt>
                <dd className="identity-summary-value">{formatRoleName(user?.role)}</dd>
              </div>
            </dl>

            {user?.institutionId && (
              <div className="identity-uuid-row mt-3 pt-3 border-t border-border-subtle flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="identity-summary-label" style={{ marginBottom: 0 }}>
                    Support Identifier:
                  </span>
                  <span className="identity-uuid-text" title={user.institutionId}>
                    {user.institutionId.slice(0, 8)}...{user.institutionId.slice(-4)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyId(user.institutionId!)}
                  aria-label="Copy institutional identifier to clipboard"
                  style={{ height: '1.625rem', padding: '0 0.5rem', fontSize: '0.6875rem' }}
                >
                  {copiedId ? (
                    <>
                      <Check size={12} className="text-success" aria-hidden="true" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} aria-hidden="true" />
                      <span>Copy ID</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {!user?.institutionId && (
            <div className="mt-3 p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <Info size={14} className="text-amber-700 flex-shrink-0" />
              <span>
                Note: Your active profile has no bound institutional ID. Server-persisted draft
                creation and submission require an accredited <code>INSTITUTION_USER</code> account.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intake Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Application Session & Program Classification</CardTitle>
          <CardDescription>
            Specify the academic calendar year and regulatory curriculum category for this
            submission.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              id="academicYear"
              label="Academic Approval Year"
              required
              helperText="Format: YYYY-YYYY (e.g. 2026-2027)"
              error={errors.academicYear}
            >
              <Input
                name="academicYear"
                placeholder="2026-2027"
                value={state.academicYear}
                onChange={(e) => onChange({ academicYear: e.target.value })}
                maxLength={20}
                required
              />
            </FormField>

            <FormField
              id="programType"
              label="Program / Curriculum Stream"
              required
              helperText="Determines applicable statutory checklists under APH 2024-27"
              error={errors.programType}
            >
              <Select
                name="programType"
                value={state.programType}
                onChange={(e) => onChange({ programType: e.target.value })}
                required
              >
                {PROGRAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Statutory Checklist Preview based on selected stream */}
          <div className="mt-4 p-4 rounded bg-info-bg border border-info-border text-on-info text-sm flex items-start gap-3">
            <Info size={18} className="mt-0.5 flex-shrink-0 text-info" aria-hidden="true" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider mb-1">
                Statutory Evidence Checklist Preview
              </p>
              <p className="text-xs mb-2">
                Based on <strong>{state.programType}</strong>, the following {requiredDocs.length}{' '}
                mandatory documents will be required in Step 3:
              </p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {requiredDocs.map((doc) => (
                  <li key={doc.documentType}>
                    <strong>{doc.displayName}</strong> — {doc.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="wizard-nav-footer">
        <div className="text-xs text-muted-foreground">
          Step 1 of 4 • Institution details and regulatory stream
        </div>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
          className="min-w-[160px]"
        >
          {isSaving ? 'Saving Draft...' : 'Continue to Infrastructure →'}
        </Button>
      </div>
    </form>
  );
}
