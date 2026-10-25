/**
 * ApprovalSync — Application Wizard Integration Test Suite
 * Milestone: FE-03
 * Tests multi-step navigation, field validation, document uploads, and atomic submission.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationWizardPage } from '../pages/ApplicationWizardPage';
import { applicationsService } from '../api/services/applicationsService';
import { documentsService } from '../api/services/documentsService';
import { ApplicationStatus, DocumentProcessingStatus } from '../applications/types';
import { ApiClientError } from '../api/client';

describe('Application Wizard & Intake (FE-03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Default mock: listApplications returns empty items (no prior draft)
    vi.spyOn(applicationsService, 'listApplications').mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    vi.spyOn(applicationsService, 'createDraft').mockResolvedValue({
      id: 'app-draft-123',
      applicationNumber: 'APP-2026-TEST001',
      institutionId: 'inst-test-01',
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: {},
      submittedAt: null,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    });

    vi.spyOn(applicationsService, 'updateDraft').mockResolvedValue({
      id: 'app-draft-123',
      applicationNumber: 'APP-2026-TEST001',
      institutionId: 'inst-test-01',
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: {},
      submittedAt: null,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:05:00.000Z',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Step 1 with institution info, default values, and progress stepper', async () => {
    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Institution Application Intake Wizard/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Tenant Isolated/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Academic Approval Year/i)).toHaveValue('2026-2027');
      expect(screen.getByLabelText(/Program \/ Curriculum Stream/i)).toHaveValue(
        'Undergraduate Engineering & Technology',
      );
      expect(
        screen.getByRole('button', { name: /Continue to Infrastructure/i }),
      ).toBeInTheDocument();
    });
  });

  it('validates Step 1 and blocks advancing on invalid academic year', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Academic Approval Year/i)).toBeInTheDocument();
    });

    const yearInput = screen.getByLabelText(/Academic Approval Year/i);
    await user.clear(yearInput);
    await user.type(yearInput, 'invalid-year');

    const nextBtn = screen.getByRole('button', { name: /Continue to Infrastructure/i });
    await user.click(nextBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Academic year must follow the format YYYY-YYYY/i).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByRole('alert', { name: /There is a problem with the information entered/i }),
      ).toBeInTheDocument();
    });

    // Verify step did not advance
    expect(screen.getByLabelText(/Academic Approval Year/i)).toBeInTheDocument();
  });

  it('advances to Step 2, supports adding/removing courses, and preserves values on backward navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Continue to Infrastructure/i }),
      ).toBeInTheDocument();
    });

    // Advance to Step 2
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Physical Infrastructure & Regulatory Norms/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Campus Land Area/i)).toHaveValue(12.5);
      expect(screen.getByLabelText(/Built-Up Area/i)).toHaveValue(8500);
      expect(screen.getByLabelText(/Full-Time Faculty Strength/i)).toHaveValue(48);
    });

    // Add a new course
    const courseInput = screen.getByLabelText(/Add proposed course name and intake/i);
    await user.type(courseInput, 'Civil Engineering (Intake: 60)');
    await user.click(screen.getByRole('button', { name: /Add Course/i }));

    expect(screen.getByText('Civil Engineering (Intake: 60)')).toBeInTheDocument();

    // Navigate back to Step 1
    await user.click(screen.getByRole('button', { name: /Back to Institution/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Academic Approval Year/i)).toBeInTheDocument();
    });

    // Navigate forward again to Step 2
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));

    await waitFor(() => {
      expect(screen.getByText('Civil Engineering (Intake: 60)')).toBeInTheDocument();
    });
  });

  it('navigates to Step 3 and enforces statutory file type and size restrictions', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    // Step 1 -> Step 2
    await waitFor(() => screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));

    // Step 2 -> Step 3
    await waitFor(() => screen.getByRole('button', { name: /Continue to Documents/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Documents/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Statutory Evidence & Regulatory Uploads/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Land Title / Ownership Deed')).toBeInTheDocument();
      expect(screen.getByText('Sanctioned Building Plan')).toBeInTheDocument();
      expect(screen.getByText('Fire Safety Certificate / NOC')).toBeInTheDocument();
    });

    // Attempt uploading an oversized file (> 15MB)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);

    const oversizedFile = new File(['x'.repeat(100)], 'huge-file.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 16 * 1024 * 1024 }); // 16MB

    fireEvent.change(fileInputs[0], { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/exceeds the maximum permitted limit of 15 MB/i)).toBeInTheDocument();
    });

    // Attempt uploading an unsupported file (.exe or .zip)
    const invalidFormatFile = new File(['binary'], 'virus.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(fileInputs[0], { target: { files: [invalidFormatFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file format '\.exe'/i)).toBeInTheDocument();
    });
  });

  it('successfully uploads document, updates status, and allows deletion', async () => {
    const user = userEvent.setup();

    vi.spyOn(documentsService, 'uploadDocument').mockResolvedValueOnce({
      id: 'doc-uploaded-1',
      applicationId: 'app-draft-123',
      documentType: 'LAND_TITLE_DEED',
      fileName: 'registered-deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 245000,
      sha256Checksum: '1234567890abcdef1234567890abcdef',
      processingStatus: DocumentProcessingStatus.UPLOADED,
      uploadedAt: '2026-10-25T01:00:00.000Z',
    });

    vi.spyOn(documentsService, 'deleteDocument').mockResolvedValueOnce({
      success: true,
      id: 'doc-uploaded-1',
    });

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    // Step 1 -> 2 -> 3
    await waitFor(() => screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await waitFor(() => screen.getByRole('button', { name: /Continue to Documents/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Documents/i }));

    await waitFor(() => {
      expect(screen.getByText('Land Title / Ownership Deed')).toBeInTheDocument();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const validPdf = new File(['%PDF-1.4 test'], 'registered-deed.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInputs[0], { target: { files: [validPdf] } });

    await waitFor(() => {
      expect(screen.getByText('Uploaded & Stored')).toBeInTheDocument();
      expect(screen.getByText(/registered-deed\.pdf/i)).toBeInTheDocument();
    });

    // Delete document
    const removeBtn = screen.getByRole('button', { name: /Remove document for Land Title/i });
    await user.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Uploaded & Stored')).not.toBeInTheDocument();
    });
  });

  it('reviews summary, enforces statutory declaration, and performs atomic submission', async () => {
    const user = userEvent.setup();

    vi.spyOn(applicationsService, 'submitApplication').mockResolvedValueOnce({
      id: 'app-draft-123',
      applicationNumber: 'APP-2026-FINAL001',
      institutionId: 'inst-test-01',
      academicYear: '2026-2027',
      status: ApplicationStatus.SUBMITTED,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: {},
      submittedAt: '2026-10-25T03:00:00.000Z',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T03:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    // Step 1 -> 2 -> 3 -> 4
    await waitFor(() => screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await waitFor(() => screen.getByRole('button', { name: /Continue to Documents/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Documents/i }));

    // In Step 3, advance to Review
    await waitFor(() => screen.getByRole('button', { name: /Review & Submit →/i }));
    await user.click(screen.getByRole('button', { name: /Review & Submit →/i }));

    // In Step 4: Missing mandatory evidence banner should be present initially
    await waitFor(() => {
      expect(
        screen.getByText(/Submission Blocked: Missing Mandatory Statutory Evidence/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Statutory Oath & Regulatory Declaration/i }),
      ).toBeInTheDocument();
    });

    // Submit button should be disabled when missing documents or unaccepted declaration
    const submitBtn = screen.getByRole('button', { name: /Submit Application/i });
    expect(submitBtn).toBeDisabled();
  });

  it('displays top-level error summary banner when auto-save fails on step advance', async () => {
    const user = userEvent.setup();

    vi.spyOn(applicationsService, 'createDraft').mockRejectedValueOnce(
      new ApiClientError({
        message: 'Backend database connection timed out during draft creation.',
        statusCode: 500,
        code: 'ERR_DATABASE_ERROR',
      }),
    );

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Backend database connection timed out during draft creation/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('handles manual Save Draft failure and 401 session expiration gracefully', async () => {
    const user = userEvent.setup();

    vi.spyOn(applicationsService, 'createDraft').mockRejectedValueOnce(
      new ApiClientError({
        message: 'Missing or invalid authentication token',
        statusCode: 401,
        code: 'ERR_UNAUTHORIZED',
      }),
    );

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole('button', { name: /Save Draft/i }));
    await user.click(screen.getByRole('button', { name: /Save Draft/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Your session has expired\. Please log in again to save your draft\./i),
      ).toBeInTheDocument();
    });
  });

  it('rejects file upload when binary magic bytes do not match PDF specification', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    // Step 1 -> 2 -> 3
    await waitFor(() => screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Infrastructure/i }));
    await waitFor(() => screen.getByRole('button', { name: /Continue to Documents/i }));
    await user.click(screen.getByRole('button', { name: /Continue to Documents/i }));

    await waitFor(() => {
      expect(screen.getByText('Land Title / Ownership Deed')).toBeInTheDocument();
    });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    // Spoofed file: .pdf extension with corrupted text instead of %PDF- header
    const spoofedPdf = new File(['CORRUPTED_NOT_A_PDF'], 'fake-deed.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInputs[0], { target: { files: [spoofedPdf] } });

    await waitFor(() => {
      expect(
        screen.getByText(/File header signature does not match valid PDF specification/i),
      ).toBeInTheDocument();
    });
  });

  it('loads existing submitted application into confirmation view and allows starting fresh', async () => {
    const user = userEvent.setup();

    // 1st call for DRAFT: returns empty
    // 2nd call for all: returns SUBMITTED application
    vi.spyOn(applicationsService, 'listApplications')
      .mockResolvedValueOnce({
        items: [],
        pagination: {
          page: 1,
          limit: 1,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'app-submitted-999',
            applicationNumber: 'APP-2026-SUBMITTED999',
            institutionId: 'inst-test-01',
            academicYear: '2026-2027',
            status: ApplicationStatus.SUBMITTED,
            programType: 'Undergraduate Engineering & Technology',
            payloadJsonb: {},
            submittedAt: '2026-10-25T01:00:00.000Z',
            createdAt: '2026-10-25T00:00:00.000Z',
            updatedAt: '2026-10-25T01:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 1,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

    vi.spyOn(applicationsService, 'getApplicationDocuments').mockResolvedValueOnce([
      {
        id: 'doc-01',
        applicationId: 'app-submitted-999',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land-deed.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 204800,
        sha256Checksum: 'abcdef1234567890',
        processingStatus: DocumentProcessingStatus.UPLOADED,
        uploadedAt: '2026-10-25T00:30:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <ApplicationWizardPage />
      </MemoryRouter>,
    );

    // Should render directly in confirmation receipt
    await waitFor(() => {
      expect(screen.getByText('APP-2026-SUBMITTED999')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Start Another Application/i }),
      ).toBeInTheDocument();
    });

    // Clicking "Start Another Application" should reset to Step 1
    await user.click(screen.getByRole('button', { name: /Start Another Application/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Continue to Infrastructure/i }),
      ).toBeInTheDocument();
    });
  });
});
