import React from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DocumentVerificationMatrixItem } from '../../scrutiny/types';

interface DocumentInspectModalProps {
  document: DocumentVerificationMatrixItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (docId: string, fileName: string) => void;
  isDownloading?: boolean;
}

export const DocumentInspectModal: React.FC<DocumentInspectModalProps> = ({
  document,
  isOpen,
  onClose,
  onDownload,
  isDownloading,
}) => {
  if (!document) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const extractedEntries = Object.entries(document.extractedFields || {});

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Document Inspection — ${document.documentType}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Basic metadata card */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>{document.fileName}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}>
                {document.mimeType} • {formatFileSize(document.fileSizeBytes)} • Status: {document.processingStatus}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDownload(document.documentId, document.fileName)}
              disabled={isDownloading}
            >
              <Download size={14} aria-hidden="true" />
              <span>Download File</span>
            </Button>
          </div>

          {/* Cryptographic SHA-256 Checksum */}
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', display: 'block', textTransform: 'uppercase' }}>
              Cryptographic SHA-256 Checksum:
            </span>
            <code
              style={{
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: '11px',
                wordBreak: 'break-all',
                color: 'var(--color-foreground)',
              }}
            >
              {document.sha256Checksum}
            </code>
          </div>
        </div>

        {/* Verification Status Summary Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {/* Duplicate Check */}
          <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', display: 'block' }}>Duplicate Status (DOC-04):</span>
            <div style={{ marginTop: '4px' }}>
              {document.duplicateStatus === 'UNIQUE' ? (
                <Badge variant="success">Unique Document</Badge>
              ) : document.duplicateStatus === 'EXACT_DUPLICATE' ? (
                <Badge variant="error">Exact Duplicate</Badge>
              ) : (
                <Badge variant="warning">Near Duplicate</Badge>
              )}
            </div>
          </div>

          {/* Integrity Check */}
          <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', display: 'block' }}>Integrity & Tamper (DOC-04):</span>
            <div style={{ marginTop: '4px' }}>
              {document.integrityStatus === 'VALID' ? (
                <Badge variant="success">Valid Structure</Badge>
              ) : (
                <Badge variant="error">Anomalies Detected</Badge>
              )}
            </div>
            {document.integrityAnomalyCodes.length > 0 && (
              <div style={{ fontSize: '10px', color: 'var(--color-error)', marginTop: '4px' }}>
                Codes: {document.integrityAnomalyCodes.join(', ')}
              </div>
            )}
          </div>

          {/* Issuer Verification */}
          <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', display: 'block' }}>Issuer Registry (DOC-05):</span>
            <div style={{ marginTop: '4px' }}>
              {document.issuerStatus === 'VERIFIED' ? (
                <Badge variant="success">Issuer Verified</Badge>
              ) : document.issuerStatus === 'SIMULATED' ? (
                <Badge variant="mock">Simulated Double</Badge>
              ) : document.issuerStatus === 'DISCREPANCY' ? (
                <Badge variant="error">Registry Discrepancy</Badge>
              ) : (
                <Badge variant="default">{document.issuerStatus.replace(/_/g, ' ')}</Badge>
              )}
            </div>
          </div>

          {/* OCR Confidence */}
          <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-foreground)', display: 'block' }}>OCR Confidence:</span>
            <div style={{ marginTop: '4px', fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-foreground)' }}>
              {Math.round(document.ocrConfidence * 100)}%
            </div>
          </div>
        </div>

        {/* Extracted Statutory Fields */}
        <div>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Extracted Structured Fields ({extractedEntries.length})
          </h4>

          {extractedEntries.length === 0 ? (
            <div style={{ color: 'var(--color-muted-foreground)', fontSize: 'var(--font-size-xs)' }}>
              No structured statutory fields were extracted by OCR for this document.
            </div>
          ) : (
            <div className="data-table-scroll" style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table className="data-table" aria-label="Extracted statutory fields">
                <thead>
                  <tr>
                    <th scope="col">Field Key</th>
                    <th scope="col">Extracted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedEntries.map(([key, val]) => (
                    <tr key={key}>
                      <td style={{ fontFamily: 'var(--font-family-mono, monospace)', fontWeight: 500, fontSize: '12px' }}>
                        {key}
                      </td>
                      <td style={{ fontWeight: 600 }}>{String(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
