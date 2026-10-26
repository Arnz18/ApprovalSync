import React, { useState } from 'react';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AuditLogProjection } from '../../audit/types';
import { truncateHash, formatAuditEventType, exportAuditLogsToCsv } from '../../audit/auditUtils';
import { formatDateUtc } from '../../undertakings/undertakingUtils';
import { PaginationMeta } from '../../api/types';
import { formatRoleName } from '../../auth/roleRoutes';

export interface AuditHistoryTableProps {
  logs: AuditLogProjection[];
  applicationId: string;
  pagination?: PaginationMeta;
  onPageChange?: (newPage: number) => void;
  onOpenProof: (sequenceNumber: string) => void;
  isLoading?: boolean;
}

export function AuditHistoryTable({
  logs,
  applicationId,
  pagination,
  onPageChange,
  onOpenProof,
}: AuditHistoryTableProps): React.ReactElement {
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const toggleExpand = (seq: string) => {
    setExpandedSeq((prev) => (prev === seq ? null : seq));
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportCsv = () => {
    exportAuditLogsToCsv(logs, applicationId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Top Header / Export Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted, #64748b)' }}>
          Sequential cryptographic audit trail for application{' '}
          <code>{applicationId.slice(0, 8)}…</code>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download size={13} aria-hidden="true" />}
          disabled={logs.length === 0}
          onClick={handleExportCsv}
        >
          Export CSV (Formula-Safe)
        </Button>
      </div>

      {/* Audit Log Table */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="data-table" aria-label="Cryptographic application audit logs">
          <thead>
            <tr>
              <th scope="col" style={{ width: '60px' }}>
                Seq #
              </th>
              <th scope="col">Timestamp (UTC)</th>
              <th scope="col">Event Classification</th>
              <th scope="col">Actor & Role</th>
              <th scope="col">Block Hash (SHA-256)</th>
              <th scope="col">Previous Hash</th>
              <th scope="col" style={{ textAlign: 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isExpanded = expandedSeq === log.sequenceNumber;

              return (
                <React.Fragment key={log.sequenceNumber}>
                  <tr>
                    {/* Sequence */}
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          fontFamily: 'monospace',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-bg-subtle, #f1f5f9)',
                        }}
                      >
                        #{log.sequenceNumber}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td>
                      <div style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {formatDateUtc(log.timestamp)}
                      </div>
                      <div
                        style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted, #64748b)' }}
                      >
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        UTC
                      </div>
                    </td>

                    {/* Event Type */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        {formatAuditEventType(log.eventType)}
                      </div>
                      <code
                        style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted, #64748b)' }}
                      >
                        {log.eventType}
                      </code>
                    </td>

                    {/* Actor */}
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                        {formatRoleName(log.actorRole)}
                      </div>
                      <div
                        style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted, #64748b)' }}
                      >
                        ID: {log.actorId.slice(0, 8)}…
                      </div>
                    </td>

                    {/* Current Hash */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <code style={{ fontSize: '0.75rem' }} title={log.currentHash}>
                          {truncateHash(log.currentHash, 6, 6)}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyHash(log.currentHash)}
                          title="Copy SHA-256 block hash"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color:
                              copiedHash === log.currentHash
                                ? 'var(--color-success, #059669)'
                                : 'var(--color-text-muted, #64748b)',
                            padding: '2px',
                          }}
                        >
                          {copiedHash === log.currentHash ? (
                            <Check size={11} />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Previous Hash */}
                    <td>
                      <code
                        style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}
                        title={log.previousHash}
                      >
                        {truncateHash(log.previousHash, 5, 5)}
                      </code>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Cpu size={12} aria-hidden="true" />}
                          onClick={() => onOpenProof(log.sequenceNumber)}
                          title="View Merkle inclusion proof for this block"
                        >
                          Proof
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={
                            isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          }
                          onClick={() => toggleExpand(log.sequenceNumber)}
                          title="Inspect raw canonical payload snapshot"
                        >
                          Payload
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Payload Row */}
                  {isExpanded && (
                    <tr style={{ backgroundColor: 'var(--color-bg-subtle, #f8fafc)' }}>
                      <td colSpan={7} style={{ padding: '0.75rem 1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>
                              Canonical Payload Snapshot (RFC 8785 JSON):
                            </span>
                            <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                              Leaf Hash: <code>{log.leafHash}</code>
                            </span>
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '0.5rem',
                              backgroundColor: 'var(--color-bg-surface, #ffffff)',
                              border: '1px solid var(--color-border, #e2e8f0)',
                              borderRadius: '4px',
                              maxHeight: '160px',
                              overflowY: 'auto',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {JSON.stringify(log.payloadSnapshot || {}, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Dataset Scope */}
      {pagination && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted, #64748b)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            Showing{' '}
            <strong>
              {pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong>{Math.min(pagination.page * pagination.limit, pagination.totalItems)}</strong>{' '}
            of <strong>{pagination.totalItems}</strong> audit blocks
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => onPageChange && onPageChange(pagination.page - 1)}
                aria-label="Previous audit logs page"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => onPageChange && onPageChange(pagination.page + 1)}
                aria-label="Next audit logs page"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
