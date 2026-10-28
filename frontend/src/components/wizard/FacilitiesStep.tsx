/**
 * ApprovalSync — Wizard Step 2: Infrastructure & Institutional Facilities Metrics
 * Milestone: FE-03
 */

import React, { useState } from 'react';
import { Layers, Plus, Trash2, HelpCircle, GraduationCap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { FormField, Input } from '../ui/FormField';
import { Button } from '../ui/Button';
import { ApplicationWizardState } from '../../applications/types';

export interface FacilitiesStepProps {
  state: ApplicationWizardState;
  onChange: (fields: Partial<ApplicationWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
  isSaving?: boolean;
}

export function FacilitiesStep({
  state,
  onChange,
  onNext,
  onBack,
  errors,
  isSaving = false,
}: FacilitiesStepProps): React.ReactElement {
  const [newCourseInput, setNewCourseInput] = useState('');

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCourseInput.trim();
    if (trimmed && !state.coursesProposed.includes(trimmed)) {
      onChange({ coursesProposed: [...state.coursesProposed, trimmed] });
      setNewCourseInput('');
    }
  };

  const handleRemoveCourse = (indexToRemove: number) => {
    const updated = state.coursesProposed.filter((_, idx) => idx !== indexToRemove);
    onChange({ coursesProposed: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="wizard-step-form">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="wizard-icon-box" aria-hidden="true">
              <Layers size={20} className="text-primary" />
            </div>
            <div>
              <CardTitle>Physical Infrastructure & Regulatory Norms</CardTitle>
              <CardDescription>
                Provide the verifiable campus land area, constructed space, faculty strength, and
                academic facilities.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              id="landAreaAcres"
              label="Campus Land Area (Acres)"
              required
              helperText="Continuous contiguous campus land"
              error={errors.landAreaAcres}
            >
              <Input
                name="landAreaAcres"
                type="number"
                step="0.01"
                min="0.1"
                placeholder="12.5"
                value={state.landAreaAcres}
                onChange={(e) =>
                  onChange({
                    landAreaAcres: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
            </FormField>

            <FormField
              id="builtUpAreaSqMeters"
              label="Built-Up Area (Sq. Meters)"
              required
              helperText="Sanctioned instructional + administrative area"
              error={errors.builtUpAreaSqMeters}
            >
              <Input
                name="builtUpAreaSqMeters"
                type="number"
                step="1"
                min="100"
                placeholder="8500"
                value={state.builtUpAreaSqMeters}
                onChange={(e) =>
                  onChange({
                    builtUpAreaSqMeters: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
            </FormField>

            <FormField
              id="facultyCount"
              label="Full-Time Faculty Strength"
              required
              helperText="Regular qualified faculty on roll"
              error={errors.facultyCount}
            >
              <Input
                name="facultyCount"
                type="number"
                step="1"
                min="1"
                placeholder="48"
                value={state.facultyCount}
                onChange={(e) =>
                  onChange({
                    facultyCount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
            </FormField>

            <FormField
              id="libraryBooksCount"
              label="Central Library Volumes"
              required
              helperText="Cataloged physical and digital titles"
              error={errors.libraryBooksCount}
            >
              <Input
                name="libraryBooksCount"
                type="number"
                step="1"
                min="0"
                placeholder="12000"
                value={state.libraryBooksCount}
                onChange={(e) =>
                  onChange({
                    libraryBooksCount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
            </FormField>

            <FormField
              id="laboratoryCount"
              label="Instructional Laboratories"
              required
              helperText="Fully equipped labs per AICTE norms"
              error={errors.laboratoryCount}
            >
              <Input
                name="laboratoryCount"
                type="number"
                step="1"
                min="0"
                placeholder="16"
                value={state.laboratoryCount}
                onChange={(e) =>
                  onChange({
                    laboratoryCount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
            </FormField>
          </div>

          {/* Proposed Courses & Specializations Section */}
          <div className="pt-4 border-t border-border-subtle">
            <label className="form-label block mb-1">
              <span>Proposed Courses & Sanctioned Intake Capacity</span>
              <span className="form-label-required" aria-hidden="true">
                *
              </span>
            </label>
            <p className="form-helper mb-3">
              List the degree or diploma programs with their requested annual student intake
              capacity.
            </p>

            {errors.coursesProposed && (
              <p className="form-error mb-3" role="alert">
                {errors.coursesProposed}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                id="newCourseInput"
                placeholder="e.g. Computer Science & Engineering (Intake: 120)"
                value={newCourseInput}
                onChange={(e) => setNewCourseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCourse(e);
                  }
                }}
                className="flex-1"
                aria-label="Add proposed course name and intake"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddCourse}
                disabled={!newCourseInput.trim()}
                leftIcon={<Plus size={16} />}
              >
                Add Course
              </Button>
            </div>

            {state.coursesProposed.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-border text-center text-muted-foreground text-sm">
                No courses added yet. Please specify at least one proposed program with intake
                capacity.
              </div>
            ) : (
              <ul className="course-list">
                {state.coursesProposed.map((course, idx) => (
                  <li key={idx} className="course-item-card">
                    <div className="course-item-info">
                      <GraduationCap
                        size={18}
                        className="text-primary flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="course-item-title">{course}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(idx)}
                      className="course-remove-btn"
                      title={`Remove course: ${course}`}
                      aria-label={`Remove course: ${course}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 p-3 bg-muted rounded border border-border-subtle flex items-start gap-2.5 text-xs text-muted-foreground">
            <HelpCircle
              size={16}
              className="text-secondary flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              All declared infrastructure parameters and proposed course intake capacities are
              evaluated during statutory review against current AICTE Approval Process Handbook
              (APH) norms.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="wizard-nav-footer">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          &larr; Back to Institution
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
          className="min-w-[160px]"
        >
          {isSaving ? 'Saving Draft...' : 'Continue to Documents \u2192'}
        </Button>
      </div>
    </form>
  );
}
