import React, { useState } from 'react';
import {
  Download,
  Eye,
  FileCheck2,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { DocumentVerificationMatrixItem } from '../../scrutiny/types';
import { DocumentInspectModal } from './DocumentInspectModal';
import { documentsService } from '../../api/services/documentsService';

interface DocumentVerificationMatrixViewProps {
  documents: DocumentVerificationMatrixItem[];
  onSelectDocumentFinding?: (documentId: string) => void;
}

export const DocumentVerificationMatrixView: React.FC<DocumentVerificationMatrixViewProps> = ({
  documents,
  onSelectDocumentFinding: _onSelectDocumentFinding,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentVerificationMatrixItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (docId: string, fileName: string) => {
    setDownloadingId(docId);
    setDownloadError(null);

    try {
      const { blob, fileName: resolvedFileName } = await documentsService.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resolvedFileName || fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDownloadError(`Failed to download ${fileName}: ${err.message}`);
      } else {
        setDownloadError(`Failed to download ${fileName}.`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (documents.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <FileCheck2 size={40} style={{ color: 'var(--color-muted-foreground)', margin: '0 auto var(--space-2)' }} aria-hidden="true" />
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>No Documents in Verification Matrix</h3>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}>
          No statutory document attachments have been associated with this application dossier.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {downloadError && (
        <Alert variant="error" title="Document Download Failure" onClose={() => setDownloadError(null)}>
          {downloadError}
        </Alert>
      )}

      <div className="data-table-container">
        <div className="data-table-scroll">
          <table className="data-table" aria-label="Document verification matrix table">
            <thead>
              <tr>
                <th scope="col">Document Type & File</th>
                <th scope="col">SHA-256 Checksum</th>
                <th scope="col">OCR Confidence</th>
                <th scope="col">Duplicate Check (DOC-04)</th>
                <th scope="col">Integrity (DOC-04)</th>
                <th scope="col">Issuer Verification (DOC-05)</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.documentId}>
                  {/* Document Type & File */}
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>
                      {doc.documentType}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted-foreground)' }}>
                      {doc.fileName} • {formatFileSize(doc.fileSizeBytes)}
                    </div>
                  </td>

                  {/* Cryptographic SHA-256 Checksum */}
                  <td>
                    <code
                      style={{
                        fontFamily: 'var(--font-family-mono, monospace)',
                        fontSize: '11px',
                        color: 'var(--color-foreground)',
                        backgroundColor: 'var(--color-background)',
                        padding: '2px 4px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-block',
                      }}
                      title={doc.sha256Checksum}
                    >
                      {doc.sha256Checksum.slice(0, 10)}...{doc.sha256Checksum.slice(-6)}
                    </code>
                  </td>

                  {/* OCR Confidence */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '6px',
                          backgroundColor: 'var(--color-muted)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(doc.ocrConfidence * 100)}%`,
                            height: '100%',
                            backgroundColor:
                              doc.ocrConfidence >= 0.8
                                ? 'var(--color-success)'
                                : doc.ocrConfidence >= 0.5
                                  ? 'var(--color-warning)'
                                  : 'var(--color-error)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {Math.round(doc.ocrConfidence * 100)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted-foreground)' }}>
                      {doc.extractedFieldCount} fields extracted
                    </div>
                  </td>

                  {/* Duplicate Check */}
                  <td>
                    {doc.duplicateStatus === 'UNIQUE' ? (
                      <Badge variant="success">Unique</Badge>
                    ) : doc.duplicateStatus === 'EXACT_DUPLICATE' ? (
                      <Badge variant="error">Exact Duplicate</Badge>
                    ) : (
                      <Badge variant="warning">Near Duplicate</Badge>
                    )}
                  </td>

                  {/* Integrity Check */}
                  <td>
                    {doc.integrityStatus === 'VALID' ? (
                      <Badge variant="success">Valid</Badge>
                    ) : (
                      <Badge variant="error">Anomalies</Badge>
                    )}
                  </td>

                  {/* Issuer Verification */}
                  <td>
                    {doc.issuerStatus === 'VERIFIED' ? (
                      <Badge variant="success">Verified</Badge>
                    ) : doc.issuerStatus === 'SIMULATED' ? (
                      <Badge variant="mock">Simulated</Badge>
                    ) : doc.issuerStatus === 'DISCREPANCY' ? (
                      <Badge variant="error">Discrepancy</Badge>
                    ) : (
                      <Badge variant="default">{doc.issuerStatus.replace(/_/g, ' ')}</Badge>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDoc(doc)}
                        title="Inspect extracted fields, full checksum, and details"
                        aria-label={`Inspect ${doc.documentType}`}
                      >
                        <Eye size={13} aria-hidden="true" />
                        <span>Inspect</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc.documentId, doc.fileName)}
                        disabled={downloadingId === doc.documentId}
                        aria-label={`Download ${doc.fileName}`}
                      >
                        <Download size={13} aria-hidden="true" />
                        <span>{downloadingId === doc.documentId ? 'Downloading...' : 'Download'}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Inspection Dialog */}
      <DocumentInspectModal
        document={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onDownload={handleDownload}
        isDownloading={downloadingId === selectedDoc?.documentId}
      />
    </div>
  );
};
