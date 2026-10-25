import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ApplicationProjection } from '../../applications/types';

interface ApplicationDataTabProps {
  application: ApplicationProjection;
}

export const ApplicationDataTab: React.FC<ApplicationDataTabProps> = ({ application }) => {
  const payload = application.payloadJsonb || {};
  const academic = (payload.academicProfile || {}) as Record<string, unknown>;
  const infra = (payload.infrastructure || {}) as Record<string, unknown>;
  const proposedCourses = (payload.proposedCourses || []) as Array<{
    name: string;
    intake: number;
    level?: string;
  }>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Physical Campus & Regulatory Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Physical Infrastructure & Regulatory Norms</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Land Area (Acres)
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-foreground)', marginTop: '4px' }}>
                {infra.landAreaAcres !== undefined ? String(infra.landAreaAcres) : '—'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Built-Up Floor Area
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-foreground)', marginTop: '4px' }}>
                {infra.builtUpAreaSqM !== undefined ? `${infra.builtUpAreaSqM} sq.m` : '—'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Faculty Headcount
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-foreground)', marginTop: '4px' }}>
                {infra.facultyCount !== undefined ? String(infra.facultyCount) : '—'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Library Holdings
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-foreground)', marginTop: '4px' }}>
                {infra.libraryBooks !== undefined ? `${infra.libraryBooks} vols` : '—'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Instructional Labs
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-foreground)', marginTop: '4px' }}>
                {infra.labCount !== undefined ? String(infra.labCount) : '—'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>
                Barrier-Free Access
              </div>
              <div style={{ marginTop: '6px' }}>
                {infra.barrierFreeAccess ? (
                  <Badge variant="success">Declared Accessible</Badge>
                ) : (
                  <Badge variant="warning">Not Declared</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposed Academic Courses & Seat Intakes */}
      <Card>
        <CardHeader>
          <CardTitle>Proposed Academic Courses & Seat Capacities</CardTitle>
        </CardHeader>
        <CardContent>
          {proposedCourses.length === 0 ? (
            <div style={{ color: 'var(--color-muted-foreground)', fontSize: 'var(--font-size-sm)' }}>
              No proposed courses were explicitly configured in the initial application payload.
            </div>
          ) : (
            <div className="data-table-scroll">
              <table className="data-table" aria-label="Proposed courses table">
                <thead>
                  <tr>
                    <th scope="col">Course / Specialization</th>
                    <th scope="col">Level</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Proposed Seat Intake</th>
                  </tr>
                </thead>
                <tbody>
                  {proposedCourses.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <Badge variant="default">{c.level || 'Undergraduate'}</Badge>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-family-mono, monospace)' }}>
                        {c.intake} seats
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affiliation & Regulatory Context */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Affiliation & Tenancy Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', display: 'block' }}>
                Affiliating University / Board
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                {(academic.affiliatingUniversity as string) || 'State Technical University'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', display: 'block' }}>
                Institution Type
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                {(academic.institutionType as string) || 'Private Self-Financing'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', display: 'block' }}>
                Institutional Tenant ID
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family-mono, monospace)' }}>
                {application.institutionId}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
