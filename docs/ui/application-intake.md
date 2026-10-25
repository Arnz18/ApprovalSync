# ApprovalSync — Institution Application Wizard & Document Upload (FE-03)

> **Document Version:** 1.0.0  
> **Milestone:** FE-03 (Institution application wizard and document upload)  
> **Lead Owner:** M4 — Frontend & Experience  
> **Backend Contract Dependencies:** BE-04 (Application intake & DTOs), DOC-01 (Document upload & storage), ADR-004 (Human Sovereignty)  
> **Design Skill:** `ui-ux-pro-max` (Enterprise Gateway / Swiss Minimalism)  
> **Status:** COMMITTED & FULLY TESTED (11 test suites, 69 automated tests passing)  

---

## 1. Executive Summary & Workflow Objectives

Milestone **FE-03** delivers the end-to-end institutional application intake experience for ApprovalSync. It replaces the early prototype placeholder route at `/applications` with an accessible, high-density, multi-step regulatory wizard. The interface guides authorized college representatives (`INSTITUTION_USER`) through institutional profiling, infrastructure declaration, statutory document uploads, pre-submission compliance review, and atomic server submission.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FE-03 Application Intake Architecture                           │
├────────────────────────┬───────────────────────────────────────────────────────────────┤
│ Step Component         │ Architectural & Regulatory Responsibility                     │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ WizardStepper          │ Responsive step navigation, completed markers, focus state    │
│ InstitutionStep (1)    │ Academic year (YYYY-YYYY), program type, category summary     │
│ FacilitiesStep (2)     │ Land area, built-up area, faculty, library, dynamic courses   │
│ DocumentUploadStep (3) │ Multipart upload, magic-byte allowlist, 15MB limit, retry/del │
│ ReviewSubmitStep (4)   │ Data audit, missing document gate, statutory declaration oath  │
│ ConfirmationStep (5)   │ Immutable application number, SUBMITTED receipt, next steps   │
└────────────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 2. Design System & `ui-ux-pro-max` Design Guidance

The application intake wizard adheres to the **Swiss Minimalism & Enterprise Gateway** design foundation established in FE-01 and FE-02, tailored for institutional regulatory compliance:

### 2.1 Visual Density & Layout Grid (Density Dial: 7/10)
- **Compact Data Groupings:** Form sections are arranged in structured two-column grids (`repeat(auto-fit, minmax(280px, 1fr))`) to allow institutional applicants to review figures without excessive vertical page sprawl.
- **Surface Elevation:** Form cards utilize pure white surfaces (`--color-surface`) framed by subtle slate borders (`--color-border-subtle`) and gentle shadows (`--shadow-sm`).
- **Typography Scale:**
  - Headings: `Lexend` font family (`--font-family-heading`) for clear structural landmark hierarchy.
  - Form Fields & Tabular Data: `Source Sans 3` (`--font-family-sans`) for legibility in numerical metric inputs.
  - Application Identifiers & Checksums: `JetBrains Mono` (`--font-family-mono`) for monospaced cryptographic and reference clarity.

### 2.2 Motion & Transition Dynamics (Motion Dial: 3/10)
- **Subtle Micro-interactions:** Step transitions, button hovers, dynamic course badge additions, and upload progress spinners operate within 150ms–200ms easing curves.
- **Accessibility:** Fully honors `prefers-reduced-motion: reduce` by zeroing transition durations in `src/styles/tokens.css`.

---

## 3. Step Hierarchy & Form Validation Architecture

Form validation operates in layers: immediate client-side syntactic validation for user feedback, combined with strict server-side validation against backend DTO constraints (`CreateApplicationDto`, `UpdateApplicationDto`).

### 3.1 Step 1 — Institutional Affiliation & Academic Year
- **Tenant Institutional Card:** Displays the caller's bound institution name and registration code derived from `useAuth().user`. Emphasizes that applications are strictly tenant-isolated to their institution.
- **Academic Year Field:** Validates against the AICTE academic year format pattern: `^\d{4}-\d{4}$` (e.g., `2025-2026`). Rejects malformed strings immediately.
- **Program Type Selector:** Binds to the frozen `ProgramType` enum (`ENGINEERING_TECHNOLOGY`, `MANAGEMENT`, `PHARMACY`, `POLYTECHNIC_DIPLOMA`, `EXTENSION_OF_APPROVAL`, `GENERAL_TECHNICAL_INSTITUTION`).
- **Dynamic Document Category Preview:** Selecting a program type dynamically computes and displays the specific statutory documents required by AICTE Approval Process Handbook (APH) norms for that discipline.

### 3.2 Step 2 — Physical Infrastructure & Academic Capacity
- **Land & Built-up Metrics:**
  - `landAreaAcres`: Validates positive numeric quantity (minimum 0.1 acres).
  - `builtUpAreaSqMeters`: Validates positive numeric floor area (minimum 100 sq. meters).
- **Academic Resources:**
  - `totalFacultyCount`: Validates positive integer (minimum 1 faculty member).
  - `libraryBooksCount`: Validates positive integer (minimum 100 books).
  - `laboratoriesCount`: Validates non-negative integer (minimum 0).
- **Dynamic Proposed Courses:**
  - Interactive chip input enabling institution representatives to add and remove proposed academic programs (e.g., "Computer Science & Engineering (AI/ML) - 60 Seats").
  - Requires at least one declared course before proceeding.

### 3.3 Accessible Error Handling & Focus Management
- **Top-Level Error Summary Banner:** When validation fails, a prominent alert (`role="alert"`) displays an enumerated list of outstanding errors. Focus is automatically shifted to the summary container so screen readers immediately announce outstanding requirements.
- **Inline Field Linkage:** Every field with a validation error receives `aria-invalid="true"` and links to its error text via `aria-describedby="[fieldId]-error"`.

---

## 4. Real Document Upload Pipeline & Constraints

The document upload pipeline in `DocumentUploadStep` provides direct integration with `DOC-01` (`POST /api/v1/applications/:id/documents`) rather than mock file selectors.

### 4.1 Document Restrictions & Security Allowlist
In compliance with backend constraints established in `DOC-01`:
- **Allowed MIME Types:** `application/pdf`, `image/jpeg`, `image/png`.
- **Magic-Byte Signature Verification:** Client-side convenience inspection reads the file header via `FileReader`:
  - PDF: `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`)
  - JPEG: `\xFF\xD8\xFF` (`0xFF 0xD8 0xFF`)
  - PNG: `\x89PNG` (`0x89 0x50 0x4E 0x47`)
- **Maximum File Size:** 15MB (`15 * 1024 * 1024` bytes).
- **Executable & Script Rejection:** Files with executable extensions (`.exe`, `.sh`, `.bat`, `.js`, `.py`) are rejected prior to transmission.

### 4.2 Slot State Machine
Each statutory document slot maintains an explicit operational state:
```
           ┌───────────┐
           │   IDLE    │
           └─────┬─────┘
                 │ (File selected & validated)
                 ▼
          ┌─────────────┐
          │  UPLOADING  │ ◄───────┐
          └──────┬──────┘         │
                 │                │
       ┌─────────┴─────────┐      │
(HTTP 201)                 │ (HTTP 4xx/5xx)
       ▼                   ▼      │
 ┌───────────┐       ┌───────────┐│
 │ UPLOADED  │       │   ERROR   ├┘ (Retry)
 └─────┬─────┘       └───────────┘
       │ (Delete)
       ▼
 ┌───────────┐
 │   IDLE    │
 └───────────┘
```

- **`idle`:** Displays document title, regulatory necessity tag (Mandatory vs. Optional), description, and standard file picker.
- **`uploading`:** File picker disabled; displays animated spinner and "Uploading and calculating SHA-256 checksum..." message.
- **`uploaded`:** Displays original filename, human-readable file size, and upload confirmation timestamp. Provides a destructive "Remove / Replace" action calling `DELETE /api/v1/applications/:id/documents/:docId`.
- **`error`:** Displays localized server error message, preserving file selection for an immediate "Retry Upload" attempt without resetting other documents.

---

## 5. Human Sovereignty & Regulatory Compliance (ADR-004)

ApprovalSync strictly enforces the **Human Sovereignty principle (ADR-004)** across the entire application and document workflow:

1. **Advisory Staging:** Successfully uploaded files are labeled:
   > *"Uploaded & Stored (Pending Regulatory Scrutiny)"*
2. **Zero Automated Clearance Claims:** The system explicitly refrains from claiming that an uploaded file is "Verified," "Authentic," or "Compliant."
3. **Statutory Human Scrutiny Notice:** The document upload step renders a permanent advisory notice:
   > *"Regulatory Notice: Uploading documents registers them in the secure document vault. Regulatory verification, OCR compliance analysis, and authenticity validation are performed during subsequent Scrutiny Officer review."*

---

## 6. Pre-Submission Review & Atomic Submission

### 6.1 Review Audit (Step 4)
Step 4 presents a complete read-only summary of all entered information across Step 1, Step 2, and Step 3:
- Institution name, registration number, academic year, and program type.
- Physical campus acreage, built-up square meters, faculty headcounts, and proposed course lists.
- Attached statutory documents with file size and upload status.
- **Missing Mandatory Document Gate:** If any required document category remains unuploaded, a prominent warning banner is rendered, and the final submit button is disabled.
- **Direct Step Editing:** Convenient "Edit Section" buttons allow the applicant to jump directly back to Step 1, 2, or 3 to correct errors without losing entered values.

### 6.2 Statutory Declaration Oath
In accordance with AICTE application submission norms, the applicant must explicitly check a legal declaration oath:
> *"I hereby certify that all information submitted in this application and supporting documents are true, complete, and authentic to the best of my knowledge. I understand that submitting false or misleading information will result in immediate rejection and statutory penal action under AICTE regulations."*

The "Submit Application to AICTE" action remains strictly disabled until this checkbox is marked.

### 6.3 Transactional Submission (Step 5)
- **Pessimistic Concurrency:** Submission dispatches `POST /api/v1/applications/:id/submit`. On the backend, this executes within a PostgreSQL database transaction under a `pessimistic_write` row lock, transitioning the application status from `DRAFT` to `SUBMITTED`.
- **Duplicate-Submit Defense:** The submit button displays an animated spinner and disables all form controls while the request is in flight (`aria-busy="true"`).
- **Confirmation Receipt:** Upon HTTP 200/201 success, Step 5 renders an institutional confirmation receipt:
  - Official server-assigned Application Number (`APP-YYYY-XXXXXXXX`).
  - Monospaced Application UUID.
  - Official timestamp of submission.
  - Regulatory next-steps roadmap (Scrutiny queue allocation, deficiency clarification period, and EVC ground inspection scheduling).
  - Print/Save Receipt action (`window.print()`).

---

## 7. Draft Management & Session Recovery

1. **Auto-Persisted Draft ID:** On initial progression past Step 1, the wizard calls `POST /api/v1/applications` to provision an editable server draft. The returned `id` is stored in component state and cached in session memory.
2. **Seamless Draft Updates:** Subsequent transitions invoke `PATCH /api/v1/applications/:id` with updated dynamic `payloadJsonb` metrics, ensuring server synchronization.
3. **Session Expiration Guard:** If the user's JWT expires during document upload or form editing, HTTP 401 returns to the centralized `AuthProvider`, preserving unsaved form metrics in memory before redirecting to login.

---

## 8. Automated Test Coverage (11 Suites, 73 Tests)

FE-03 is accompanied by comprehensive automated Vitest test suites:

| Test File | Category | Focus Areas | Tests |
|---|---|---|---|
| `application-wizard.spec.tsx` | Component / Wizard | Step navigation, Step 1 & 2 validation, course chips, Step 3 file uploads, Step 4 oath gate, submission receipt, auto-save error recovery, magic-byte preflight rejection, submitted application view | 10 |
| `applications-service.spec.ts` | API Service | `createDraft`, `updateDraft`, `getApplication`, `listApplications`, `submitApplication`, `getApplicationDocuments` | 6 |
| `documents-service.spec.ts` | API Service | Multipart FormData generation, upload response parsing, document metadata retrieval, document deletion | 3 |
| `routes.spec.tsx` | Route Protection | `/applications` route mounts `ApplicationWizardPage`, RBAC guards, unauthenticated redirect | 7 |
| `components.spec.tsx` | UI Primitives | Buttons, badges, form fields, alerts, modal dialogs, empty states | 11 |
| `login-page.spec.tsx` | Authentication | Form validation, credentials submission, anti-enumeration, demo helper | 8 |
| `role-nav.spec.tsx` | Navigation & RBAC | Role matrix filtering, safe return URLs, unauthorized route suppression | 7 |
| `auth-context.spec.tsx` | Session Lifecycle | Initial session bootstrap, token storage, logout, error recovery | 6 |
| `auth-service.spec.ts` | Auth API | Login API, profile retrieval, token injection, HTTP 401/403 errors | 5 |
| `api-client.spec.ts` | Transport Layer | Correlation IDs, timeout aborts, multipart uploads, envelope unwrapping | 7 |
| `shell.spec.tsx` | Workspace Shell | Layout, header, sidebar, mobile navigation drawer | 3 |
| **Total** | | **11 Suites Passing (100% Pass Rate)** | **73** |
