/**
 * ApprovalSync — Application Wizard Client-Side Validation
 * Milestone: FE-03
 * Mirrors backend DTO validation rules (CreateApplicationDto, UpdateApplicationDto)
 * and statutory minimums from AICTE Approval Process Handbook (APH).
 */

import { ApplicationWizardState, resolveCategoryKey, CATEGORY_REQUIREMENTS } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorList: Array<{ field: string; message: string }>;
}

/**
 * Validate Step 1: Institution and Program details
 */
export function validateInstitutionStep(state: Partial<ApplicationWizardState>): ValidationResult {
  const errors: Record<string, string> = {};

  // Academic year: Required, format YYYY-YYYY
  if (!state.academicYear || state.academicYear.trim().length === 0) {
    errors.academicYear = 'Academic year is required.';
  } else if (!/^\d{4}-\d{4}$/.test(state.academicYear.trim())) {
    errors.academicYear = 'Academic year must follow the format YYYY-YYYY (e.g. 2026-2027).';
  } else {
    const [startYear, endYear] = state.academicYear.split('-').map(Number);
    if (endYear !== startYear + 1) {
      errors.academicYear =
        'Academic year end must be exactly one year after start (e.g. 2026-2027).';
    }
  }

  // Program type: Required, max 100 characters
  if (!state.programType || state.programType.trim().length === 0) {
    errors.programType = 'Program / curriculum type is required.';
  } else if (state.programType.trim().length > 100) {
    errors.programType = 'Program type cannot exceed 100 characters.';
  }

  const errorList = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return {
    isValid: errorList.length === 0,
    errors,
    errorList,
  };
}

/**
 * Validate Step 2: Infrastructure & Institutional Facilities Metrics
 */
export function validateFacilitiesStep(state: Partial<ApplicationWizardState>): ValidationResult {
  const errors: Record<string, string> = {};

  // Faculty count: positive integer
  if (state.facultyCount === undefined || state.facultyCount === '') {
    errors.facultyCount = 'Faculty count is required.';
  } else {
    const val = Number(state.facultyCount);
    if (!Number.isInteger(val) || val <= 0) {
      errors.facultyCount = 'Faculty count must be a positive integer greater than zero.';
    }
  }

  // Land area acres: positive number
  if (state.landAreaAcres === undefined || state.landAreaAcres === '') {
    errors.landAreaAcres = 'Campus land area is required.';
  } else {
    const val = Number(state.landAreaAcres);
    if (isNaN(val) || val <= 0) {
      errors.landAreaAcres = 'Campus land area must be a positive number greater than zero.';
    }
  }

  // Built-up area: positive number
  if (state.builtUpAreaSqMeters === undefined || state.builtUpAreaSqMeters === '') {
    errors.builtUpAreaSqMeters = 'Total built-up area is required.';
  } else {
    const val = Number(state.builtUpAreaSqMeters);
    if (isNaN(val) || val <= 0) {
      errors.builtUpAreaSqMeters = 'Built-up area must be a positive number greater than zero.';
    }
  }

  // Library books count: non-negative integer
  if (state.libraryBooksCount === undefined || state.libraryBooksCount === '') {
    errors.libraryBooksCount = 'Library books volume count is required.';
  } else {
    const val = Number(state.libraryBooksCount);
    if (!Number.isInteger(val) || val < 0) {
      errors.libraryBooksCount = 'Library books count must be zero or a positive integer.';
    }
  }

  // Laboratory count: non-negative integer
  if (state.laboratoryCount === undefined || state.laboratoryCount === '') {
    errors.laboratoryCount = 'Instructional laboratory count is required.';
  } else {
    const val = Number(state.laboratoryCount);
    if (!Number.isInteger(val) || val < 0) {
      errors.laboratoryCount = 'Laboratory count must be zero or a positive integer.';
    }
  }

  // Proposed courses: at least 1 course
  if (!state.coursesProposed || state.coursesProposed.length === 0) {
    errors.coursesProposed = 'At least one proposed course or specialization must be specified.';
  }

  const errorList = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return {
    isValid: errorList.length === 0,
    errors,
    errorList,
  };
}

/**
 * Validate Step 3: Statutory Document Uploads
 */
export function validateDocumentsStep(state: Partial<ApplicationWizardState>): ValidationResult {
  const errors: Record<string, string> = {};
  const categoryKey = resolveCategoryKey(state.programType);
  const requirements =
    CATEGORY_REQUIREMENTS[categoryKey] || CATEGORY_REQUIREMENTS.GENERAL_TECHNICAL_INSTITUTION;

  const uploadedTypes = new Set((state.uploadedDocuments || []).map((doc) => doc.documentType));

  const missingMandatory = requirements.filter(
    (req) => req.isMandatory && !uploadedTypes.has(req.documentType),
  );

  if (missingMandatory.length > 0) {
    const missingNames = missingMandatory.map((r) => r.displayName).join(', ');
    errors.documents = `The following mandatory statutory documents are missing: ${missingNames}. All mandatory categories must be uploaded before submitting.`;
  }

  const errorList = Object.entries(errors).map(([field, message]) => ({ field, message }));
  return {
    isValid: errorList.length === 0,
    errors,
    errorList,
  };
}

/**
 * Validate Step 4: Review and Declaration
 */
export function validateReviewStep(state: Partial<ApplicationWizardState>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!state.declarationAccepted) {
    errors.declaration =
      'You must certify the statutory declaration under oath before submitting this application.';
  }

  // Also verify that steps 1, 2, and 3 remain valid
  const step1 = validateInstitutionStep(state);
  const step2 = validateFacilitiesStep(state);
  const step3 = validateDocumentsStep(state);

  const allErrors = {
    ...errors,
    ...step1.errors,
    ...step2.errors,
    ...step3.errors,
  };

  const errorList = Object.entries(allErrors).map(([field, message]) => ({ field, message }));
  return {
    isValid: errorList.length === 0,
    errors: allErrors,
    errorList,
  };
}
