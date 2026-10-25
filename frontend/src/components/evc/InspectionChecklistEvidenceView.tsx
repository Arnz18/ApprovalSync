import React, { useState } from 'react';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Camera,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { documentsService } from '../../api/services/documentsService';
import { InspectionChecklistItem, InspectionItemOutcome } from '../../evc/types';
import { DocumentMetadataProjection } from '../../applications/types';

interface InspectionChecklistEvidenceViewProps {
  applicationId: string;
  documents: DocumentMetadataProjection[];
  isLoadingDocuments: boolean;
}

// Default statutory inspection items grounded in AICTE APH 2024-25 standards
const INITIAL_CHECKLIST_ITEMS: InspectionChecklistItem[] = [
  {
    id: 'chk-01',
    category: 'LAND_AND_BUILDING',
    code: 'EVC_LAND_BOUNDARY_WALL',
    title: 'Perimeter Boundary Wall & Physical Contiguity',
    standardNorm:
      'Continuous compound boundary wall minimum 1.8m height enclosing entire designated campus land without fragmentation.',
    outcome: 'UNCHECKED',
    inspectorNotes: '',
    sourceCitation: 'AICTE APH 2024-25, Clause 4.1.2 (Land Norms)',
    isSavedToServer: false,
  },
  {
    id: 'chk-02',
    category: 'LAND_AND_BUILDING',
    code: 'EVC_BUILTUP_INSTRUCTIONAL',
    title: 'Instructional Floor Area Physical Measurement',
    standardNorm:
      'Actual constructed carpet area of lecture halls, tutorial rooms, and workshops matches approved blueprint schedule.',
    outcome: 'UNCHECKED',
    inspectorNotes: '',
    sourceCitation: 'AICTE APH 2024-25, Appendix 4 (Built-up Space Schedules)',
    isSavedToServer: false,
  },
  {
    id: 'chk-03',
    category: 'FIRE_SAFETY_DISASTER',
    code: 'EVC_FIRE_EQUIPMENT_LIVE',
    title: 'Operational Fire Fighting & Extinguisher Equipment',
    standardNorm:
      'Functional wet riser, fire hose reels, ABC dry chemical extinguishers in date, and unblocked egress escape stairwells.',
    outcome: 'UNCHECKED',
    inspectorNotes: '',
    sourceCitation: 'National Building Code (Part IV Fire Safety) & APH Clause 5.2',
    isSavedToServer: false,
  },
  {
    id: 'chk-04',
    category: 'BARRIER_FREE_ACCESSIBILITY',
    code: 'EVC_BARRIER_FREE_RAMPS',
    title: 'Universal Barrier-Free Ramps & Elevators',
    standardNorm:
      'Gradient 1:12 accessible entrance ramps with handrails, tactile ground indicators, and elevator access to upper instructional floors.',
    outcome: 'UNCHECKED',
    inspectorNotes: '',
    sourceCitation: 'RPwD Act 2016 Standards & APH Clause 5.3',
    isSavedToServer: false,
  },
  {
    id: 'chk-05',
    category: 'LABORATORIES_EQUIPMENT',
    code: 'EVC_LABS_CORE_EQUIPMENT',
    title: 'Core Laboratories & Equipment Commissioning',
    standardNorm:
      'Minimum required experimental setups for declared programs installed, powered, calibrated, and operational.',
    outcome: 'UNCHECKED',
    inspectorNotes: '',
    sourceCitation: 'AICTE Model Curriculum & Laboratory Requirements Schedule',
    isSavedToServer: false,
  },
];

export const InspectionChecklistEvidenceView: React.FC<InspectionChecklistEvidenceViewProps> = ({
  documents,
  isLoadingDocuments,
}) => {
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>(INITIAL_CHECKLIST_ITEMS);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleOutcomeChange = (id: string, newOutcome: InspectionItemOutcome) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, outcome: newOutcome } : item)),
    );
  };

  const handleNotesChange = (id: string, notes: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inspectorNotes: notes } : item)),
    );
  };

  const handleDownload = async (docId: string, fileName: string) => {
    setDownloadingDocId(docId);
    try {
      const { blob, fileName: resolvedName } = await documentsService.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resolvedName || fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Document download failed:', err);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const verifiedCount = checklist.filter((c) => c.outcome === 'VERIFIED').length;
  const discrepancyCount = checklist.filter((c) => c.outcome === 'DISCREPANCY').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Persistence Boundary Disclaimer */}
      <div>
        <Alert
          variant="warning"
          title="Working Inspection Aid (Client-Side Local Draft — Non-Persisted to Server)"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <AlertTriangle
              size={18}
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: '2px' }}
            />
            <span>
              <strong>Contract Boundary:</strong> The backend does not currently provide an
              inspection checklist mutation endpoint (
              <code>POST /api/v1/applications/:id/inspection-checklist</code>). Items checked and
              working notes recorded below function as an in-session inspection aid and are not
              persisted to the central database. To formalize findings, use authorized workflow
              transitions (e.g. Escalate to SHC).
            </span>
          </div>
        </Alert>
      </div>

      {/* 2. Attached Statutory Evidence Documents */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
              }}
            >
              Submitted Documentary Evidence
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: '2px 0 0 0',
              }}
            >
              Authorized institution attachments available for on-site cross-verification against
              physical assets.
            </p>
          </div>
          <Badge variant="secondary">{documents.length} Attachments</Badge>
        </div>

        {isLoadingDocuments ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-6)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            Loading documentary attachments...
          </div>
        ) : documents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-6)',
              color: 'var(--color-muted-foreground)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            No documentary attachments found for this application.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <FileText
                    size={20}
                    aria-hidden="true"
                    style={{ color: 'var(--color-primary)', flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      {doc.fileName}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-muted-foreground)',
                        marginTop: '2px',
                      }}
                    >
                      {doc.documentType} • {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB •
                      Status: {doc.processingStatus}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.id, doc.fileName)}
                  disabled={downloadingDocId === doc.id}
                  title="Download and inspect authentic uploaded document"
                >
                  <Download
                    size={14}
                    aria-hidden="true"
                    style={{ marginRight: 'var(--space-1)' }}
                  />
                  {downloadingDocId === doc.id ? 'Downloading...' : 'Inspect Attachment'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Notice on Photo Capture & Geotagging API */}
        <div
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
          }}
        >
          <Camera
            size={20}
            aria-hidden="true"
            style={{ color: 'var(--color-primary)', flexShrink: 0 }}
          />
          <div>
            <strong>On-Site Photo & Video Evidence Upload:</strong> Centralized geotagged ground
            evidence upload (<code>POST /api/v1/applications/:id/inspection-evidence</code>) with
            GPS bounding verification is under M1/M2 backend contract specification. Local capture
            is currently paused until the secure multipart endpoint is provisioned.
          </div>
        </div>
      </Card>

      {/* 3. Interactive Working Inspection Checklist Aid */}
      <Card style={{ padding: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
              }}
            >
              On-Site Physical Inspection Checklist Aid
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: '2px 0 0 0',
              }}
            >
              Statutory verification standards based on AICTE Approval Process Handbook (APH
              2024-25).
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <span
              style={{ color: 'var(--color-success)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              {verifiedCount} Verified
            </span>
            <span>•</span>
            <span
              style={{ color: 'var(--color-error)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              {discrepancyCount} Discrepant
            </span>
            <span>•</span>
            <span style={{ color: 'var(--color-muted-foreground)' }}>
              {checklist.length - verifiedCount - discrepancyCount} Unchecked
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {checklist.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                background: 'var(--color-surface)',
                borderLeft:
                  item.outcome === 'VERIFIED'
                    ? '4px solid var(--color-success)'
                    : item.outcome === 'DISCREPANCY'
                      ? '4px solid var(--color-error)'
                      : '4px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 'var(--font-weight-bold)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-muted-foreground)',
                      marginLeft: 'var(--space-2)',
                    }}
                  >
                    [{item.code}]
                  </span>
                </div>

                {/* Outcome Toggle Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <button
                    type="button"
                    onClick={() => handleOutcomeChange(item.id, 'VERIFIED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: 'var(--font-size-xs)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      background:
                        item.outcome === 'VERIFIED'
                          ? 'var(--color-success)'
                          : 'var(--color-surface)',
                      color: item.outcome === 'VERIFIED' ? '#ffffff' : 'var(--color-foreground)',
                      cursor: 'pointer',
                      fontWeight:
                        item.outcome === 'VERIFIED'
                          ? 'var(--font-weight-bold)'
                          : 'var(--font-weight-normal)',
                    }}
                  >
                    <CheckCircle2 size={12} aria-hidden="true" />
                    Verified
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOutcomeChange(item.id, 'DISCREPANCY')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: 'var(--font-size-xs)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      background:
                        item.outcome === 'DISCREPANCY'
                          ? 'var(--color-error)'
                          : 'var(--color-surface)',
                      color: item.outcome === 'DISCREPANCY' ? '#ffffff' : 'var(--color-foreground)',
                      cursor: 'pointer',
                      fontWeight:
                        item.outcome === 'DISCREPANCY'
                          ? 'var(--font-weight-bold)'
                          : 'var(--font-weight-normal)',
                    }}
                  >
                    <XCircle size={12} aria-hidden="true" />
                    Discrepancy
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOutcomeChange(item.id, 'UNCHECKED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: 'var(--font-size-xs)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      background:
                        item.outcome === 'UNCHECKED'
                          ? 'var(--color-surface-hover)'
                          : 'var(--color-surface)',
                      color: 'var(--color-muted-foreground)',
                      cursor: 'pointer',
                    }}
                  >
                    <HelpCircle size={12} aria-hidden="true" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Requirement Description */}
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  margin: 'var(--space-2) 0',
                  color: 'var(--color-foreground)',
                }}
              >
                {item.standardNorm}
              </p>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-muted-foreground)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <strong>Statutory Basis:</strong> {item.sourceCitation}
              </div>

              {/* Working Notes Textarea */}
              <div style={{ marginTop: 'var(--space-2)' }}>
                <label
                  htmlFor={`notes-${item.id}`}
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-muted-foreground)',
                    marginBottom: '2px',
                  }}
                >
                  Inspector Working Notes (Local Scratchpad):
                </label>
                <textarea
                  id={`notes-${item.id}`}
                  rows={2}
                  className="scrutiny-filter-input"
                  placeholder="Record on-site physical observations, tape measurements, or discrepancy details..."
                  value={item.inspectorNotes}
                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-muted-foreground)',
                    background: 'var(--color-surface-hover)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  Local Draft Aid • Non-Persisted
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
