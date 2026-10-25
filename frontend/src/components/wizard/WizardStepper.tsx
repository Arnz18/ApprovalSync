/**
 * ApprovalSync — Application Wizard Progress Stepper
 * Milestone: FE-03
 * Accessible multi-step indicator adhering to ui-ux-pro-max guidelines.
 */

import React from 'react';
import { Check, Building2, Layers, FileText, Send } from 'lucide-react';
import { WizardStep } from '../../applications/types';

export interface WizardStepperProps {
  currentStep: WizardStep;
  highestVisitedStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  isSubmitting?: boolean;
}

interface StepItem {
  step: WizardStep;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: StepItem[] = [
  {
    step: WizardStep.INSTITUTION_INFO,
    title: 'Institution & Program',
    subtitle: 'Affiliation & session',
    icon: <Building2 size={16} />,
  },
  {
    step: WizardStep.PROGRAM_FACILITIES,
    title: 'Infrastructure & Metrics',
    subtitle: 'Campus, labs & faculty',
    icon: <Layers size={16} />,
  },
  {
    step: WizardStep.DOCUMENT_UPLOAD,
    title: 'Statutory Documents',
    subtitle: 'Evidence attachments',
    icon: <FileText size={16} />,
  },
  {
    step: WizardStep.REVIEW_SUBMIT,
    title: 'Review & Submit',
    subtitle: 'Audit & declaration',
    icon: <Send size={16} />,
  },
];

export function WizardStepper({
  currentStep,
  highestVisitedStep,
  onStepClick,
  isSubmitting = false,
}: WizardStepperProps): React.ReactElement {
  // If in confirmation step, do not render interactive stepper
  if (currentStep === WizardStep.CONFIRMATION) {
    return <></>;
  }

  return (
    <nav aria-label="Application Intake Steps" className="wizard-stepper-container">
      <ol className="wizard-stepper-list">
        {STEPS.map((item, index) => {
          const isCurrent = currentStep === item.step;
          const isCompleted = currentStep > item.step;
          const isNavigable = item.step <= highestVisitedStep && !isSubmitting;

          return (
            <li
              key={item.step}
              className={`wizard-step-item ${isCurrent ? 'is-current' : ''} ${
                isCompleted ? 'is-completed' : ''
              } ${isNavigable ? 'is-navigable' : 'is-disabled'}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                onClick={() => isNavigable && onStepClick(item.step)}
                disabled={!isNavigable}
                className="wizard-step-button"
                aria-label={`Step ${item.step}: ${item.title}${isCompleted ? ' (completed)' : ''}${
                  isCurrent ? ' (current step)' : ''
                }`}
              >
                <span className="wizard-step-indicator" aria-hidden="true">
                  {isCompleted ? (
                    <Check size={16} className="wizard-step-check-icon" />
                  ) : (
                    <span className="wizard-step-number">{item.step}</span>
                  )}
                </span>
                <span className="wizard-step-content">
                  <span className="wizard-step-label">Step {item.step}</span>
                  <span className="wizard-step-title">{item.title}</span>
                  <span className="wizard-step-subtitle">{item.subtitle}</span>
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`wizard-step-connector ${isCompleted ? 'is-completed' : ''}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
