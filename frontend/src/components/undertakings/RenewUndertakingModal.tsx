import React, { useState } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Alert } from '../ui/Alert';
import { UndertakingProjection, RenewUndertakingDto } from '../../undertakings/types';
import { undertakingsService } from '../../api/services/undertakingsService';
import { ApiClientError } from '../../api/client';

export interface RenewUndertakingModalProps {
  undertaking: UndertakingProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (renewed: UndertakingProjection) => void;
}

export function RenewUndertakingModal({
  undertaking,
  isOpen,
  onClose,
  onSuccess,
}: RenewUndertakingModalProps): React.ReactElement | null {
  const [startDate, setStartDate] = useState(undertaking?.expiryDate || '');
  const [expiryDate, setExpiryDate] = useState(() => {
    if (undertaking?.expiryDate) {
      try {
        const d = new Date(undertaking.expiryDate);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
      } catch {
        return '';
      }
    }
    return '';
  });
  const [renewalLeadDays, setRenewalLeadDays] = useState<number>(
    undertaking?.renewalLeadDays || 60,
  );
  const [documentNumber, setDocumentNumber] = useState('');
  const [counterpartyName, setCounterpartyName] = useState(undertaking?.counterpartyName || '');
  const [renewalNotes, setRenewalNotes] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!startDate) {
      errors.startDate = 'New commencement date is required';
    }

    if (!expiryDate) {
      errors.expiryDate = 'New expiry date is required';
    } else if (startDate && expiryDate <= startDate) {
      errors.expiryDate = 'New expiry date must be strictly after the commencement date';
    }

    if (renewalLeadDays < 1) {
      errors.renewalLeadDays = 'Renewal lead days must be at least 1 day';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !undertaking) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    const dto: RenewUndertakingDto = {
      startDate,
      expiryDate,
      renewalLeadDays: Number(renewalLeadDays) || 60,
      documentNumber: documentNumber.trim() || undefined,
      counterpartyName: counterpartyName.trim() || undefined,
      renewalNotes: renewalNotes.trim() || undefined,
    };

    try {
      const renewed = await undertakingsService.renewUndertaking(undertaking.id, dto);
      onSuccess(renewed);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setApiError(err.message || 'Renewal operation failed.');
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected network or server error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!undertaking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Superseding Renewal & Lease Extension"
      description={`Source Record: ${undertaking.title} (Doc No: ${undertaking.documentNumber || 'N/A'})`}
      className="modal-wide"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw size={14} aria-hidden="true" />}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Execute Superseding Renewal
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {apiError && (
          <Alert variant="error" title="Renewal Failed">
            {apiError}
          </Alert>
        )}

        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <Info
            size={16}
            color="var(--color-primary, #2563eb)"
            style={{ flexShrink: 0, marginTop: '2px' }}
          />
          <div>
            <strong>Cycle-Safe Supersession Architecture (ADR-004 Renewal Lineage Rule): </strong>
            Renewal will create a new successor undertaking record with updated dates, linking back
            to record <code>{undertaking.id}</code>. The current record will automatically
            transition to <strong>SUPERSEDED</strong>. Prior historical audit events and regulatory
            review notes are permanently preserved.
          </div>
        </div>

        {/* Dates & Renewal Lead */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="renewal-startdate"
            label="Renewal Commencement Date"
            required
            error={formErrors.startDate}
            helperText="Effective start of renewed period"
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </FormField>

          <FormField
            id="renewal-expirydate"
            label="New Expiry Date"
            required
            error={formErrors.expiryDate}
            helperText="New expiry date after extension"
          >
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="form-input"
            />
          </FormField>

          <FormField
            id="renewal-lead"
            label="Renewal Lead Days"
            required
            error={formErrors.renewalLeadDays}
            helperText="Lead time in days for future renewal warning"
          >
            <input
              type="number"
              min={1}
              max={3650}
              value={renewalLeadDays}
              onChange={(e) => setRenewalLeadDays(Number(e.target.value))}
              className="form-input"
            />
          </FormField>
        </div>

        {/* Document Number & Counterparty */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="renewal-docnum"
            label="Renewal Deed / Document Number (Optional)"
            helperText="Supplemental lease deed registration or updated NOC serial"
          >
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g. PUN-REG-RENEWAL-2025-0012"
              className="form-input"
            />
          </FormField>

          <FormField
            id="renewal-counterparty"
            label="Updated Counterparty / Lessor Name (Optional)"
            helperText="Leave blank to retain existing counterparty"
          >
            <input
              type="text"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder="e.g. Maharashtra Industrial Development Corporation"
              className="form-input"
            />
          </FormField>
        </div>

        <FormField
          id="renewal-notes"
          label="Renewal Justification & Covenant Modifications (Optional)"
          helperText="Reason for tenure extension or amendments to statutory terms"
        >
          <textarea
            rows={3}
            value={renewalNotes}
            onChange={(e) => setRenewalNotes(e.target.value)}
            placeholder="e.g. Tenure extended for 30 years with registered supplemental lease agreement."
            className="form-input"
          />
        </FormField>
      </form>
    </Modal>
  );
}
