import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Alert } from '../ui/Alert';
import {
  UndertakingType,
  CreateUndertakingDto,
  UndertakingProjection,
} from '../../undertakings/types';
import { formatUndertakingType } from '../../undertakings/undertakingUtils';
import { undertakingsService } from '../../api/services/undertakingsService';
import { ApiClientError } from '../../api/client';

export interface CreateUndertakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (undertaking: UndertakingProjection) => void;
  initialApplicationId?: string;
  defaultInstitutionId?: string;
}

export function CreateUndertakingModal({
  isOpen,
  onClose,
  onSuccess,
  initialApplicationId,
  defaultInstitutionId,
}: CreateUndertakingModalProps): React.ReactElement {
  const [type, setType] = useState<UndertakingType>(UndertakingType.LAND_LEASE);
  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [renewalLeadDays, setRenewalLeadDays] = useState<number>(180);
  const [applicationId, setApplicationId] = useState(initialApplicationId || '');
  const institutionId = defaultInstitutionId || '';
  const [description, setDescription] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (newType: UndertakingType) => {
    setType(newType);
    if (newType === UndertakingType.LAND_LEASE) {
      setRenewalLeadDays(180);
    } else if (renewalLeadDays === 180) {
      setRenewalLeadDays(60);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Instrument title is required';
    } else if (title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!startDate) {
      errors.startDate = 'Commencement date is required';
    }

    if (!expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else if (startDate && expiryDate <= startDate) {
      errors.expiryDate = 'Expiry date must be strictly after the commencement date';
    }

    if (renewalLeadDays < 1) {
      errors.renewalLeadDays = 'Renewal lead time must be at least 1 day';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    const dto: CreateUndertakingDto = {
      type,
      title: title.trim(),
      startDate,
      expiryDate,
      renewalLeadDays: Number(renewalLeadDays) || 60,
      documentNumber: documentNumber.trim() || undefined,
      issuingAuthority: issuingAuthority.trim() || undefined,
      counterpartyName: counterpartyName.trim() || undefined,
      applicationId: applicationId.trim() || undefined,
      institutionId: institutionId.trim() || undefined,
      description: description.trim() || undefined,
    };

    try {
      const created = await undertakingsService.createUndertaking(dto);
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setApiError(err.message || 'Failed to create undertaking record.');
        if (err.details && err.details.length > 0) {
          const fieldMap: Record<string, string> = {};
          err.details.forEach((d) => {
            fieldMap[d.field] = d.message;
          });
          setFormErrors((prev) => ({ ...prev, ...fieldMap }));
        }
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected network or server error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Statutory Undertaking / Lease"
      description="Register a new legal undertaking, land lease deed, or statutory clearance in DRAFT status."
      className="modal-wide"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle size={14} aria-hidden="true" />}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Save & Create Instrument
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {apiError && (
          <Alert variant="error" title="Unable to Create Record">
            {apiError}
          </Alert>
        )}

        {/* Type & Title */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="undertaking-type"
            label="Undertaking / Instrument Type"
            required
            helperText="Select regulatory category per AICTE Approval Process Handbook"
          >
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as UndertakingType)}
              className="form-select"
            >
              {Object.values(UndertakingType).map((t) => (
                <option key={t} value={t}>
                  {formatUndertakingType(t)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="undertaking-title"
            label="Instrument Title / Deed Name"
            required
            error={formErrors.title}
            helperText="e.g. Registered 30-Year Land Lease Deed for Pune Campus"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30-Year Registered Land Lease Deed"
              className="form-input"
            />
          </FormField>
        </div>

        {/* Document Number & Issuing Authority */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="undertaking-docnum"
            label="Document / Deed / Registration Number"
            helperText="Sub-registrar registration serial or NOC reference"
          >
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g. DEED-KA-2021-0092"
              className="form-input"
            />
          </FormField>

          <FormField
            id="undertaking-authority"
            label="Issuing / Registering Authority"
            helperText="Government department or sub-registrar office"
          >
            <input
              type="text"
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              placeholder="e.g. Sub-Registrar Office, Bangalore South"
              className="form-input"
            />
          </FormField>
        </div>

        {/* Counterparty & Dates */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="undertaking-counterparty"
            label="Counterparty / Lessor / Sponsoring Trust"
            helperText="Lessor or executing entity"
          >
            <input
              type="text"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder="e.g. Maharashtra Industrial Dev Corp"
              className="form-input"
            />
          </FormField>

          <FormField
            id="undertaking-startdate"
            label="Commencement Date"
            required
            error={formErrors.startDate}
            helperText="Date instrument takes legal effect (UTC)"
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </FormField>

          <FormField
            id="undertaking-expirydate"
            label="Expiry / Validity Date"
            required
            error={formErrors.expiryDate}
            helperText="Date validity expires (UTC)"
          >
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="form-input"
            />
          </FormField>

          <FormField
            id="undertaking-lead"
            label="Renewal Lead Time (Days)"
            required
            error={formErrors.renewalLeadDays}
            helperText="Days before expiry to trigger renewal due status"
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

        {/* Optional Application Association */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="undertaking-appid"
            label="Associated Application UUID (Optional)"
            helperText="Link this instrument to an active approval case workflow"
          >
            <input
              type="text"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              placeholder="e.g. a0000000-0000-0000-0000-000000000001"
              className="form-input"
            />
          </FormField>

          <FormField
            id="undertaking-description"
            label="Terms, Covenants, or Plot Survey Details (Optional)"
            helperText="Summary of leased parcel, survey numbers, or special covenants"
          >
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Survey No. 452/1 comprising 7.5 contiguous acres in Pune District"
              className="form-input"
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
