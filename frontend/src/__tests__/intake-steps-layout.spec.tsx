import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstitutionStep } from '../components/wizard/InstitutionStep';
import { FacilitiesStep } from '../components/wizard/FacilitiesStep';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue } from '../auth/types';
import { UserRole } from '../api/types';
import { ApplicationWizardState, WizardStep } from '../applications/types';

describe('Application Intake Form Layout & Typography (DEF-UI-01 & DEF-UI-05)', () => {
  const mockAuthState: AuthContextValue = {
    user: {
      id: 'usr-demo-70224b01',
      email: 'demo.institution@synthetic.approvalsync.local',
      name: 'Demo Institution Representative',
      role: UserRole.INSTITUTION_USER,
      institutionId: '70224b01-b1d2-4a63-8899-aabbccddeeff',
      isActive: true,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    status: 'AUTHENTICATED',
    isAuthenticated: true,
    isInitializing: false,
    initError: null,
    login: vi.fn(),
    logout: vi.fn(),
    retryInitialization: vi.fn().mockResolvedValue(undefined),
  };

  const initialWizardState: ApplicationWizardState = {
    currentStep: WizardStep.INSTITUTION_INFO,
    highestVisitedStep: WizardStep.INSTITUTION_INFO,
    academicYear: '2026-2027',
    programType: 'Undergraduate Engineering & Technology',
    facultyCount: 48,
    landAreaAcres: 12.5,
    builtUpAreaSqMeters: 8500,
    libraryBooksCount: 12000,
    laboratoryCount: 16,
    coursesProposed: [
      'Computer Science & Engineering (Intake: 120)',
      'Mechanical Engineering (Intake: 60)',
    ],
    declarationAccepted: false,
    uploadedDocuments: [],
    isSubmitting: false,
    saveStatus: 'idle',
  };

  it('InstitutionStep renders semantic identity grid without text concatenation', () => {
    render(
      <AuthContext.Provider value={mockAuthState}>
        <InstitutionStep
          state={initialWizardState}
          onChange={vi.fn()}
          onNext={vi.fn()}
          errors={{}}
        />
      </AuthContext.Provider>,
    );

    // Verify labels are distinct
    expect(screen.getByText('Authorized Representative')).toBeInTheDocument();
    expect(screen.getByText('Demo Institution Representative')).toBeInTheDocument();

    expect(screen.getByText('Institutional Email')).toBeInTheDocument();
    expect(screen.getByText('demo.institution@synthetic.approvalsync.local')).toBeInTheDocument();

    expect(screen.getByText('Account Role')).toBeInTheDocument();
    expect(screen.getByText('Institution Representative')).toBeInTheDocument();

    // Verify UUID is housed in secondary identifier section with copy control
    expect(screen.getByText(/Support Identifier:/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Copy institutional identifier to clipboard/i }),
    ).toBeInTheDocument();
  });

  it('FacilitiesStep renders courses as structured cards with accessible remove buttons and no raw bullets', () => {
    const handleChange = vi.fn();
    const handleNext = vi.fn();
    const handleBack = vi.fn();

    render(
      <FacilitiesStep
        state={initialWizardState}
        onChange={handleChange}
        onNext={handleNext}
        onBack={handleBack}
        errors={{}}
      />,
    );

    // Verify courses render as clean items
    expect(screen.getByText('Computer Science & Engineering (Intake: 120)')).toBeInTheDocument();
    expect(screen.getByText('Mechanical Engineering (Intake: 60)')).toBeInTheDocument();

    // Verify accessible remove buttons
    const removeCsBtn = screen.getByRole('button', {
      name: /Remove course: Computer Science & Engineering/i,
    });
    expect(removeCsBtn).toBeInTheDocument();

    fireEvent.click(removeCsBtn);
    expect(handleChange).toHaveBeenCalledWith({
      coursesProposed: ['Mechanical Engineering (Intake: 60)'],
    });

    // Verify payloadJsonb technical jargon is removed and replaced with regulatory guidance
    expect(screen.queryByText(/payloadJsonb/i)).not.toBeInTheDocument();
    expect(screen.getByText(/All declared infrastructure parameters/i)).toBeInTheDocument();

    // Verify footer navigation actions
    expect(screen.getByRole('button', { name: /Back to Institution/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Documents/i })).toBeInTheDocument();
  });
});
