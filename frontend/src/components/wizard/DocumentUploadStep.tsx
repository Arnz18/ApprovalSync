/**
 * ApprovalSync — Wizard Step 3: Statutory Document Uploads
 * Milestone: FE-03
 * Connects to DOC-01 document upload endpoint: POST /api/v1/applications/:id/documents
 * Enforces magic-byte allowlist, 15MB limit, and category completeness.
 * Enforces Human Sovereignty (ADR-004): documents are "Uploaded (Pending Scrutiny)", never auto-verified.
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Shield,
  FileCheck,
  AlertOctagon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { documentsService } from '../../api/services/documentsService';
import { ApiClientError } from '../../api/client';
import {
  ApplicationWizardState,
  DocumentMetadataProjection,
  resolveCategoryKey,
  CATEGORY_REQUIREMENTS,
  DocumentRequirement,
} from '../../applications/types';

export interface DocumentUploadStepProps {
  state: ApplicationWizardState;
  onChange: (fields: Partial<ApplicationWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  onEnsureDraftSaved: () => Promise<string>;
  errors: Record<string, string>;
  isSaving?: boolean;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface UploadSlotState {
  file: File | null;
  status: 'idle' | 'uploading' | 'error';
  errorMessage?: string;
}

export function DocumentUploadStep({
  state,
  onChange,
  onNext,
  onBack,
  onEnsureDraftSaved,
  errors,
  isSaving = false,
}: DocumentUploadStepProps): React.ReactElement {
  const [slotStates, setSlotStates] = useState<Record<string, UploadSlotState>>({});
  const [globalUploadError, setGlobalUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const categoryKey = resolveCategoryKey(state.programType);
  const requirements: DocumentRequirement[] =
    CATEGORY_REQUIREMENTS[categoryKey] || CATEGORY_REQUIREMENTS.GENERAL_TECHNICAL_INSTITUTION;

  const uploadedDocsByType = React.useMemo(() => {
    const map = new Map<string, DocumentMetadataProjection>();
    (state.uploadedDocuments || []).forEach((doc) => {
      map.set(doc.documentType, doc);
    });
    return map;
  }, [state.uploadedDocuments]);

  // Client-side quick file validation
  const validateSelectedFile = (file: File): string | null => {
    if (file.size === 0) {
      return 'File is empty (0 bytes). Please select a valid document.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${formatBytes(file.size)}) exceeds the maximum permitted limit of 15 MB.`;
    }
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format '${ext}'. Only PDF (.pdf), JPEG (.jpg, .jpeg), and PNG (.png) files are accepted.`;
    }
    return null;
  };

  /**
   * Preflight binary header magic-byte verification.
   * Matches DOC-01 security constraints before transmission:
   * - PDF: %PDF-
   * - JPEG: \xFF\xD8\xFF
   * - PNG: \x89PNG
   * - Blocks disguised executables (MZ)
   */
  const inspectFileMagicBytes = async (file: File): Promise<string | null> => {
    if (typeof FileReader === 'undefined' || typeof file.slice !== 'function') {
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      const slice = file.slice(0, 8);

      reader.onload = () => {
        try {
          const buffer = new Uint8Array(reader.result as ArrayBuffer);
          if (buffer.length < 3) {
            resolve('File is too short or corrupted.');
            return;
          }

          // Check for Windows executable (MZ header)
          if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
            resolve(
              'Security Alert: Windows executable file disguised with an allowed extension was rejected.',
            );
            return;
          }

          const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;

          if (ext === '.pdf') {
            const isPdf =
              buffer.length >= 5 &&
              buffer[0] === 0x25 &&
              buffer[1] === 0x50 &&
              buffer[2] === 0x44 &&
              buffer[3] === 0x46 &&
              buffer[4] === 0x2d;
            if (!isPdf) {
              resolve(
                'File header signature does not match valid PDF specification (%PDF-). File may be corrupted or disguised.',
              );
              return;
            }
          } else if (ext === '.jpg' || ext === '.jpeg') {
            const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
            if (!isJpeg) {
              resolve(
                'File header signature does not match valid JPEG specification. File may be corrupted.',
              );
              return;
            }
          } else if (ext === '.png') {
            const isPng =
              buffer.length >= 4 &&
              buffer[0] === 0x89 &&
              buffer[1] === 0x50 &&
              buffer[2] === 0x4e &&
              buffer[3] === 0x47;
            if (!isPng) {
              resolve(
                'File header signature does not match valid PNG specification. File may be corrupted.',
              );
              return;
            }
          }

          resolve(null);
        } catch {
          resolve(null);
        }
      };

      reader.onerror = () => {
        resolve('Unable to read file headers. Please check file permissions and try again.');
      };

      reader.readAsArrayBuffer(slice);
    });
  };

  const handleFileChange = async (documentType: string, file: File | null) => {
    if (!file) return;

    setGlobalUploadError(null);
    const validationError = validateSelectedFile(file);
    if (validationError) {
      setSlotStates((prev) => ({
        ...prev,
        [documentType]: { file, status: 'error', errorMessage: validationError },
      }));
      return;
    }

    const magicByteError = await inspectFileMagicBytes(file);
    if (magicByteError) {
      setSlotStates((prev) => ({
        ...prev,
        [documentType]: { file, status: 'error', errorMessage: magicByteError },
      }));
      return;
    }

    // Update state to uploading
    setSlotStates((prev) => ({
      ...prev,
      [documentType]: { file, status: 'uploading', errorMessage: undefined },
    }));

    try {
      // Ensure application draft is saved on backend first to obtain a valid applicationId
      const applicationId = await onEnsureDraftSaved();

      // Perform real multipart upload
      const uploadedDoc = await documentsService.uploadDocument(
        applicationId,
        file,
        documentType,
        `Uploaded during application intake for ${documentType}`,
      );

      // Replace or append uploaded document in state
      const currentList = state.uploadedDocuments.filter((d) => d.documentType !== documentType);
      onChange({
        uploadedDocuments: [...currentList, uploadedDoc],
      });

      setSlotStates((prev) => ({
        ...prev,
        [documentType]: { file: null, status: 'idle', errorMessage: undefined },
      }));
    } catch (err: unknown) {
      let message = 'Upload failed. Please check network connection and try again.';
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          message = 'Your session has expired. Please log in again to continue uploading.';
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setSlotStates((prev) => ({
        ...prev,
        [documentType]: { file, status: 'error', errorMessage: message },
      }));
    }
  };

  const handleDeleteDocument = async (documentType: string, docId: string) => {
    setGlobalUploadError(null);
    try {
      await documentsService.deleteDocument(docId);
      const updated = state.uploadedDocuments.filter((d) => d.id !== docId);
      onChange({ uploadedDocuments: updated });

      // Reset slot input
      if (fileInputRefs.current[documentType]) {
        fileInputRefs.current[documentType]!.value = '';
      }
      setSlotStates((prev) => ({
        ...prev,
        [documentType]: { file: null, status: 'idle', errorMessage: undefined },
      }));
    } catch (err: unknown) {
      let message = 'Failed to delete document from storage.';
      if (err instanceof ApiClientError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setGlobalUploadError(message);
    }
  };

  const handleRetryUpload = (documentType: string) => {
    const slot = slotStates[documentType];
    if (slot?.file) {
      handleFileChange(documentType, slot.file);
    }
  };

  const uploadedCount = requirements.filter((r) => uploadedDocsByType.has(r.documentType)).length;
  const isAllMandatoryUploaded = requirements
    .filter((r) => r.isMandatory)
    .every((r) => uploadedDocsByType.has(r.documentType));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="wizard-step-form">
      {/* Overview Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="wizard-icon-box" aria-hidden="true">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <CardTitle>Statutory Evidence & Regulatory Uploads</CardTitle>
                <CardDescription>
                  Upload authenticated legal records matching AICTE APH 2024-27 checklist for{' '}
                  <strong>{state.programType}</strong>.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isAllMandatoryUploaded ? 'success' : 'warning'}
                icon={
                  isAllMandatoryUploaded ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />
                }
              >
                {uploadedCount} of {requirements.length} Evidence Records Uploaded
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded bg-muted border border-border-subtle text-xs text-muted-foreground flex items-start gap-3">
            <FileCheck size={18} className="text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground mb-1">
                Security & Format Constraints (DOC-01):
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  Accepted formats: <strong>PDF (.pdf)</strong>, <strong>JPEG (.jpg, .jpeg)</strong>
                  , and <strong>PNG (.png)</strong>.
                </li>
                <li>
                  Maximum file size: <strong>15 MB</strong> per attachment.
                </li>
                <li>
                  MIME and magic-byte inspection (%PDF-, \x89PNG, \xFF\xD8\xFF) will be verified by
                  the backend.
                </li>
                <li>
                  <strong>Human Sovereignty Notice:</strong> Uploaded evidence is securely hashed
                  and stored for official review. Uploading does not imply automated approval or
                  instant authentication.
                </li>
              </ul>
            </div>
          </div>

          {globalUploadError && (
            <div
              className="mt-4 p-3 rounded bg-error-bg border border-error-border text-on-error text-sm flex items-center gap-2"
              role="alert"
            >
              <AlertOctagon size={16} />
              <span>{globalUploadError}</span>
            </div>
          )}

          {errors.documents && (
            <div
              className="mt-4 p-3 rounded bg-warning-bg border border-warning-border text-on-warning text-sm flex items-start gap-2"
              role="alert"
            >
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errors.documents}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirement Slots List */}
      <div className="space-y-4 mb-6">
        {requirements.map((req) => {
          const uploaded = uploadedDocsByType.get(req.documentType);
          const slot = slotStates[req.documentType];
          const isUploading = slot?.status === 'uploading';
          const hasError = slot?.status === 'error';

          return (
            <div
              key={req.documentType}
              className={`p-5 rounded-lg border transition-all ${
                uploaded
                  ? 'bg-surface border-success-border shadow-xs'
                  : hasError
                    ? 'bg-error-bg/30 border-error-border'
                    : 'bg-surface border-border hover:border-secondary'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{req.displayName}</span>
                    {req.isMandatory ? (
                      <Badge variant="warning" className="text-[10px]">
                        Mandatory
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">
                        Optional
                      </Badge>
                    )}
                    <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {req.documentType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{req.description}</p>
                  {req.sourceClause && (
                    <p className="text-[11px] text-secondary font-mono">
                      Statutory Reference: {req.sourceClause}
                    </p>
                  )}
                </div>

                {/* Upload Status / Actions */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  {uploaded ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 text-success font-medium text-xs">
                          <CheckCircle2 size={14} />
                          <span>Uploaded & Stored</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          {uploaded.fileName} ({formatBytes(uploaded.fileSizeBytes)})
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block font-mono">
                          SHA: {uploaded.sha256Checksum?.slice(0, 16)}...
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(req.documentType, uploaded.id)}
                        className="text-error hover:bg-error-bg"
                        title="Remove uploaded document"
                        aria-label={`Remove document for ${req.displayName}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {/* Hidden native input */}
                      <input
                        type="file"
                        ref={(el) => {
                          fileInputRefs.current[req.documentType] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(req.documentType, file);
                        }}
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        className="hidden"
                        id={`file-upload-${req.documentType}`}
                        disabled={isUploading || isSaving}
                      />

                      {isUploading ? (
                        <div className="flex items-center gap-2 text-secondary text-xs font-medium p-2 bg-info-bg rounded border border-info-border">
                          <RefreshCw size={14} className="spinner" />
                          <span>Streaming to Storage...</span>
                        </div>
                      ) : hasError ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            leftIcon={<RefreshCw size={14} />}
                            onClick={() => handleRetryUpload(req.documentType)}
                          >
                            Retry Upload
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRefs.current[req.documentType]?.click()}
                          >
                            Choose Different File
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<Upload size={14} />}
                          onClick={() => fileInputRefs.current[req.documentType]?.click()}
                          disabled={isSaving}
                        >
                          Select & Upload
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Slot Error Notification */}
              {hasError && slot?.errorMessage && (
                <div
                  className="mt-3 p-2.5 rounded bg-error-bg border border-error-border text-on-error text-xs flex items-center gap-2"
                  role="alert"
                >
                  <AlertOctagon size={14} className="flex-shrink-0" />
                  <span>{slot.errorMessage}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          ← Back to Infrastructure
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
          className="min-w-[160px]"
        >
          {isSaving ? 'Saving Draft...' : 'Review & Submit →'}
        </Button>
      </div>
    </form>
  );
}
