import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  Compass,
  Plus,
  Trash2,
  Save,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui';
import { ApplicationProjection } from '../../applications/types';
import {
  ApplicationStatus,
  CommitteeExpertMember,
  EvcScheduleData,
  CreateEvcSchedulePayload,
} from '../../api/types';
import { workflowService } from '../../api/services/workflowService';
import { ComplianceAssessmentResult } from '../../evc/types';

interface ExpertSchedulingViewProps {
  application: ApplicationProjection;
  compliance?: ComplianceAssessmentResult | null;
  onScheduleUpdated?: () => void;
}

export const ExpertSchedulingView: React.FC<ExpertSchedulingViewProps> = ({
  application,
  compliance: _compliance,
  onScheduleUpdated,
}) => {
  const [schedule, setSchedule] = useState<EvcScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [visitDate, setVisitDate] = useState<string>('');
  const [visitType, setVisitType] = useState<'PHYSICAL_VISIT' | 'VIRTUAL_VISIT' | 'HYBRID'>('PHYSICAL_VISIT');
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeExpertMember[]>([
    {
      name: 'Prof. Ramesh K. Verma',
      designation: 'Professor & Head, Civil Engineering',
      organization: 'National Institute of Technology',
      roleInCommittee: 'CHAIRMAN',
      conflictOfInterestDeclared: true,
    },
    {
      name: 'Dr. Sunita Deshmukh',
      designation: 'Associate Professor, Electrical Engineering',
      organization: 'Government College of Engineering',
      roleInCommittee: 'EXPERT_MEMBER',
      conflictOfInterestDeclared: true,
    },
    {
      name: 'Ar. Rajesh Malhotra',
      designation: 'Chief Council Architect (COA)',
      organization: 'State PWD / Council of Architecture',
      roleInCommittee: 'ARCHITECTURAL_EXPERT',
      conflictOfInterestDeclared: true,
    },
  ]);
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [outcomeRecommendation, setOutcomeRecommendation] = useState<
    'PENDING' | 'RECOMMENDED' | 'DEFICIENCIES_NOTED' | 'REJECTED'
  >('PENDING');

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getEvcSchedule(application.id);
      if (data) {
        setSchedule(data);
        setVisitDate(data.visitDate ? data.visitDate.substring(0, 10) : '');
        setVisitType(data.visitType || 'PHYSICAL_VISIT');
        setCommitteeMembers(data.committeeMembers && data.committeeMembers.length > 0 ? data.committeeMembers : committeeMembers);
        setVisitNotes(data.visitNotes || '');
        setOutcomeRecommendation(data.outcomeRecommendation || 'PENDING');
      } else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setVisitDate(nextWeek.toISOString().substring(0, 10));
        setIsEditing(true);
      }
    } catch {
      setErrorMessage('Failed to load authoritative EVC schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [application.id]);

  const handleAddMember = () => {
    setCommitteeMembers([
      ...committeeMembers,
      {
        name: '',
        designation: '',
        organization: '',
        roleInCommittee: 'EXPERT_MEMBER',
        conflictOfInterestDeclared: true,
      },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    setCommitteeMembers(committeeMembers.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof CommitteeExpertMember, value: unknown) => {
    const updated = [...committeeMembers];
    updated[index] = { ...updated[index], [field]: value };
    setCommitteeMembers(updated);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!visitDate) {
      setErrorMessage('Please select a scheduled inspection visit date.');
      return;
    }

    if (committeeMembers.length === 0) {
      setErrorMessage('Expert Committee must include at least one nominated expert.');
      return;
    }

    for (let i = 0; i < committeeMembers.length; i++) {
      if (!committeeMembers[i].name.trim()) {
        setErrorMessage(`Expert member #${i + 1} requires a valid name.`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload: CreateEvcSchedulePayload = {
        visitDate: new Date(visitDate).toISOString(),
        visitType,
        committeeMembers,
        visitNotes: visitNotes.trim() || undefined,
        outcomeRecommendation,
      };

      const saved = await workflowService.saveEvcSchedule(application.id, payload);
      setSchedule(saved);
      setIsEditing(false);
      setSuccessMessage('EVC Committee visit and roster scheduled successfully. Alert notification issued.');
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to persist EVC schedule.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const isEvcRecommended = application.status === ApplicationStatus.RECOMMENDED_FOR_EVC;
  const isEvcInProgress = application.status === ApplicationStatus.EVC_IN_PROGRESS;
  const isShcRecommended = application.status === ApplicationStatus.RECOMMENDED_FOR_SHC;
  const isApproved = application.status === ApplicationStatus.APPROVED;
  const isRejected = application.status === ApplicationStatus.REJECTED;

  const getStatusBadge = () => {
    if (isEvcRecommended) return <Badge variant="primary">Awaiting Inspector Roster</Badge>;
    if (isEvcInProgress) return <Badge variant="info">Inspection In Progress</Badge>;
    if (isShcRecommended) return <Badge variant="warning">Committee Escalation</Badge>;
    if (isApproved) return <Badge variant="success">Completed &amp; Approved</Badge>;
    if (isRejected) return <Badge variant="error">Completed &amp; Rejected</Badge>;
    return <Badge variant="default">{application.status}</Badge>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Regulatory Context Banner */}
      <div>
        <Alert variant="info" title="AICTE Regulation Bureau • Expert Visit Committee (EVC) Administration">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Compass size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px', color: '#0284c7' }} />
            <span>
              <strong>Expert Visit Committee (EVC) Module:</strong> Synchronized physical and virtual inspection
              scheduling, expert roster conflict-of-interest declarations, and statutory committee recommendation logging.
              All assignments issue real-time notifications to the regional inspection cell and applicant institution.
            </span>
          </div>
        </Alert>
      </div>

      {successMessage && (
        <Alert variant="success" title="Schedule Persisted">
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="error" title="Action Error">
          {errorMessage}
        </Alert>
      )}

      {loading && (
        <div style={{ padding: 'var(--space-4) 0', display: 'flex', justifyContent: 'center' }}>
          <Spinner label="Loading authoritative committee inspection schedule..." />
        </div>
      )}

      {/* 2. Overview Banner */}
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
              EVC Inspection Status &amp; Expert Roster
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: '2px 0 0 0',
              }}
            >
              Authoritative case progress derived from server-verified workflow FSM state.
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', marginBottom: '4px' }}>
              APPLICATION NUMBER
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
              {application.applicationNumber}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', marginBottom: '4px' }}>
              SCHEDULED VISIT DATE
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
              {schedule?.visitDate
                ? new Date(schedule.visitDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not Yet Scheduled'}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', marginBottom: '4px' }}>
              INSPECTION MODE
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
              {schedule?.visitType ? schedule.visitType.replace('_', ' ') : 'PHYSICAL VISIT'}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)', marginBottom: '4px' }}>
              OUTCOME RECOMMENDATION
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
              {schedule?.outcomeRecommendation ? (
                <span
                  style={{
                    color:
                      schedule.outcomeRecommendation === 'RECOMMENDED'
                        ? '#16a34a'
                        : schedule.outcomeRecommendation === 'DEFICIENCIES_NOTED'
                        ? '#d97706'
                        : schedule.outcomeRecommendation === 'REJECTED'
                        ? '#dc2626'
                        : '#475569',
                  }}
                >
                  {schedule.outcomeRecommendation}
                </span>
              ) : (
                'Pending Inspection'
              )}
            </div>
          </div>
        </div>

        {/* Action Toggle */}
        <div
          style={{
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant={isEditing ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel Edit' : schedule ? 'Update Visit & Committee Details' : 'Schedule EVC Committee Visit'}
          </Button>
        </div>
      </Card>

      {/* 3. Existing Committee Summary (When Not Editing and Schedule Exists) */}
      {!isEditing && schedule && (
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Users size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
              Assigned Expert Committee Roster ({schedule.committeeMembers.length} Members)
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Expert Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Designation</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Institution / Organization</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>COI Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.committeeMembers.map((member, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                          backgroundColor:
                            member.roleInCommittee === 'CHAIRMAN'
                              ? '#dbeafe'
                              : member.roleInCommittee === 'ARCHITECTURAL_EXPERT'
                              ? '#fef3c7'
                              : '#f1f5f9',
                          color:
                            member.roleInCommittee === 'CHAIRMAN'
                              ? '#1e40af'
                              : member.roleInCommittee === 'ARCHITECTURAL_EXPERT'
                              ? '#92400e'
                              : '#334155',
                        }}
                      >
                        {member.roleInCommittee.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{member.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{member.designation}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{member.organization}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: member.conflictOfInterestDeclared ? '#16a34a' : '#dc2626',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      >
                        <ShieldCheck size={14} />
                        {member.conflictOfInterestDeclared ? 'No Conflict Declared' : 'Pending Declaration'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {schedule.visitNotes && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                VISIT NOTES &amp; GROUND OBSERVATIONS
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                {schedule.visitNotes}
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: 'var(--space-3)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} />
            Scheduled by {schedule.scheduledByName} on {new Date(schedule.updatedAt).toLocaleDateString('en-IN')}
          </div>
        </Card>
      )}

      {/* 4. Scheduling Form (When Editing or Creating) */}
      {isEditing && (
        <Card style={{ padding: 'var(--space-5)' }}>
          <form onSubmit={handleSaveSchedule}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <UserCheck size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                {schedule ? 'Modify EVC Inspection & Roster' : 'Schedule New EVC Inspection Visit'}
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Inspection Date *
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Visit Type *
                </label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as 'PHYSICAL_VISIT' | 'VIRTUAL_VISIT' | 'HYBRID')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <option value="PHYSICAL_VISIT">Physical On-Site Visit</option>
                  <option value="VIRTUAL_VISIT">Virtual Tele-Inspection</option>
                  <option value="HYBRID">Hybrid (Documentary &amp; Physical)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Outcome Recommendation
                </label>
                <select
                  value={outcomeRecommendation}
                  onChange={(e) =>
                    setOutcomeRecommendation(
                      e.target.value as 'PENDING' | 'RECOMMENDED' | 'DEFICIENCIES_NOTED' | 'REJECTED',
                    )
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <option value="PENDING">PENDING (Visit Scheduled)</option>
                  <option value="RECOMMENDED">RECOMMENDED (Clean Infrastructure)</option>
                  <option value="DEFICIENCIES_NOTED">DEFICIENCIES NOTED (Requires SAC/SHC)</option>
                  <option value="REJECTED">REJECTED (Critical Violations)</option>
                </select>
              </div>
            </div>

            {/* Committee Members Dynamic Table */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  Expert Committee Members &amp; COI Declarations ({committeeMembers.length})
                </label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMember}>
                  <Plus size={14} style={{ marginRight: '4px' }} /> Add Expert
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {committeeMembers.map((member, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface-hover)',
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1.5fr 1.5fr 1.2fr auto auto',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <input
                        type="text"
                        placeholder="Expert Name *"
                        value={member.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Designation"
                        value={member.designation}
                        onChange={(e) => handleMemberChange(idx, 'designation', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Institution / Org"
                        value={member.organization}
                        onChange={(e) => handleMemberChange(idx, 'organization', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                    <div>
                      <select
                        value={member.roleInCommittee}
                        onChange={(e) => handleMemberChange(idx, 'roleInCommittee', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <option value="CHAIRMAN">Chairman</option>
                        <option value="EXPERT_MEMBER">Expert Member</option>
                        <option value="CONVENER">Convener</option>
                        <option value="ARCHITECTURAL_EXPERT">Architectural Expert</option>
                      </select>
                    </div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.6875rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={member.conflictOfInterestDeclared}
                        onChange={(e) => handleMemberChange(idx, 'conflictOfInterestDeclared', e.target.checked)}
                      />
                      No COI
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      disabled={committeeMembers.length <= 1}
                      title="Remove member"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: committeeMembers.length <= 1 ? '#cbd5e1' : '#dc2626',
                        cursor: committeeMembers.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Visit Notes */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                Visit Notes &amp; Committee Instructions
              </label>
              <textarea
                rows={3}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Enter scope of verification, laboratory equipment checks, physical barrier-free compliance observations, etc."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                <Save size={14} style={{ marginRight: '4px' }} />
                {saving ? 'Persisting Schedule...' : 'Persist EVC Schedule & Issue Notification'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
