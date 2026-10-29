# NiyamSetu — Evaluator Walkthrough & Troubleshooting Guide
### Integrated AICTE Approval Workflow Automation, Compliance Monitoring, and Alert Management System
**Regulation Bureau • All India Council for Technical Education (AICTE)** • *Problem Statement ID: 26262*

---

## 1. Quick Verification Checklist

Before initiating evaluation, confirm the three core layers of the platform are operational:

| Component | Target URL / Port | Expected Response | Diagnostic Command |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16 DB** | `127.0.0.1:5434` | Container status `healthy` | `docker compose ps` |
| **NestJS Backend** | `http://localhost:3000/api/v1/health` | `{"success":true,"data":{"status":"ok"}}` | `curl http://localhost:3000/api/v1/health` |
| **Swagger API Docs** | `http://localhost:3000/api/docs` | OpenAPI 3.0 interactive documentation | Open in browser |
| **React 18 Frontend** | `http://localhost:5173` | NiyamSetu Login Portal with 4 stakeholder cards | Open in browser |

---

## 2. Pre-Seeded Evaluation Credentials

The login page at `http://localhost:5173/login` features interactive role cards that pre-fill synthetic credentials and configure designated landing routing:

| Stakeholder Role | Login Email | Password | Designated Landing |
| :--- | :--- | :--- | :--- |
| **Technical Institution** | `institution@niyamsetu.gov.in` | `DemoPass@123` | `/dashboard` *(Institution View)* |
| **Scrutiny Officer** | `scrutiny@niyamsetu.gov.in` | `DemoPass@123` | `/scrutiny` *(Scrutiny Desk)* |
| **Regional Officer** | `regional@niyamsetu.gov.in` | `DemoPass@123` | `/dashboard` *(Regional Console)* |
| **System Administrator** | `admin@niyamsetu.gov.in` | `DemoPass@123` | `/dashboard` *(Admin Console)* |
| **Independent Auditor** | `auditor@synthetic.approvalsync.local` | `DemoPass@123` | `/audit` *(Audit Ledger)* |

---

## 3. Step-by-Step Evaluator Walkthrough

### Scenario A: Technical Institution Intake & Draft Resumption
1. Navigate to `http://localhost:5173/login`.
2. Click the **Technical Institution** card in the stakeholder grid below the form.
3. Click **Enter Applicant Workspace** (or Sign In).
4. **Theme Verification:** In the top-right header, toggle the animated Dark Mode switch. Observe the transition to the near-black `#0A0A0A` palette without UI flicker. Refresh the page to confirm persistent local storage.
5. **Draft Resumption:** On the Institutional Dashboard, observe the **Draft Resumption** notice displaying saved in-progress applications. Click **Resume Draft** (or navigate to `/applications?draftId=...`).
6. **Form & Step Restoration:** Observe that the wizard restores directly to the saved step index (e.g. Physical Infrastructure & Norms) with previously entered faculty counts, land acreage, and proposed courses intact.
7. **Unified File Upload:** Advance to Step 3 (Statutory Evidence Uploads). Observe the single accessible upload component. Select a PDF document; observe the client-side preflight magic-byte check (`%PDF-`), streaming progress animation, and cryptographic SHA-256 preview. Note the one-click **Replace** button.
8. **Undertakings & Leases:** Click **Undertakings & Leases** in the sidebar (`/undertakings`). Observe active lease covenants categorized by AICTE's 30-year statutory validity requirement.

---

### Scenario B: Scrutiny Officer Documentary Review & Deficiency Notice
1. Sign out and sign in using the **Scrutiny Officer** card (`scrutiny@niyamsetu.gov.in`).
2. Observe immediate landing on the **Scrutiny Desk** (`/scrutiny`) with the pending application queue.
3. Click on case **APP-2026-DEMO-002** or any listed case to open the docket.
4. **Consolidated Dossier Findings:** Inspect the multi-tab interface:
   - **Dossier Findings:** AI anomaly indicators, OCR extractions, and heuristic compliance limits under the **ADR-004 Human Sovereignty** boundary.
   - **Document Matrix:** Structural PDF verification, pHash duplicate detection scores, and issuer status.
   - **Workflow Timeline:** Chronological audit events from draft creation to scrutiny queue.
5. **Print & PDF Export:** Click **Print Dossier PDF** in the header. Notice that the print preview cleanly suppresses sidebars, navigation bars, and buttons, rendering a multi-page executive audit report suitable for Council submission.
6. **FSM Transition:** Click **Issue Deficiency Notice**. Enter a justification comment (e.g. *"Building floor plan lacks fire exit certification"*). Confirm the transition; observe the application status update to `DEFICIENCY_ISSUED`.

---

### Scenario C: Regional Officer EVC Inspection Scheduling
1. Sign in using the **Regional Officer** card (`regional@niyamsetu.gov.in`).
2. Navigate to **EVC Ground Inspection** (`/evc`).
3. Select an application recommended for ground verification.
4. **Committee Composition:** Inspect the 3-member Expert Committee roster (Chairman, Subject Expert, Structural/Infrastructure Specialist).
5. **Conflict of Interest:** Check the mandatory Conflict-of-Interest declaration checkbox and click **Persist EVC Schedule**.

---

### Scenario D: System Administrator & SLA Deadline Sweep
1. Sign in using the **System Administrator** card (`admin@niyamsetu.gov.in`).
2. **Stage Pendency Monitor:** On `/dashboard`, view the stage-wise pendency distribution chart tracking dwell times and cases in each approval phase.
3. **SLA Policies:** Click **Inspect SLA Policies** to review configured turnaround thresholds across Tier 1 (RO Warning), Tier 2 (Breach Alert), and Tier 3 (Council Escalation).
4. **On-Demand Sweep:** Click **Trigger SLA Deadline Sweep**. The backend executes an automated check across all active stage timers, evaluating warning deadlines and emitting escalation events into the notifications stream.

---

### Scenario E: Independent Auditor Cryptographic Ledger
1. Sign in using `auditor@synthetic.approvalsync.local`.
2. Notice automatic landing on `/audit` (Audit Ledger & Proofs).
3. Inspect the sequential SHA-256 cryptographic chain linking every state transition to its predecessor block (`parentHash`).
4. Click **Verify Merkle Proof** to view the mathematical verification of event integrity.

---

## 4. Diagnostic & Troubleshooting Guide

### Issue 1: "Unable to connect to the authentication service" on Login
- **Root Cause:** The NestJS backend is not running or is blocked.
- **Resolution:**
  1. Verify the backend process is running in terminal:
     ```bash
     cd backend
     npm run start:dev
     ```
  2. Confirm `http://localhost:3000/api/v1/health` returns status `ok`.
  3. Verify `frontend/.env` contains `VITE_API_BASE_URL=http://localhost:3000`.

### Issue 2: PostgreSQL Port Conflict (`port 5434 is already in use`)
- **Root Cause:** Another PostgreSQL instance or zombie container is bound to host port 5434.
- **Resolution:**
  1. Inspect running containers:
     ```bash
     docker ps
     ```
  2. Stop conflicting containers:
     ```bash
     docker stop approvalsync-postgres
     docker compose up -d
     ```
  3. Note: The project explicitly uses port **5434** to prevent conflicts with standard host PostgreSQL installations on 5432. Do not change `DB_PORT=5434` without updating both `backend/.env` and `compose.yaml`.

### Issue 3: "Database connection timed out during migration or seed"
- **Root Cause:** Docker container is still initializing or volume permissions require verification.
- **Resolution:**
  1. Wait 5 seconds for PostgreSQL healthcheck:
     ```bash
     docker compose ps
     ```
  2. Rerun migrations and seed:
     ```bash
     cd backend
     npm run migration:run
     npm run seed
     ```

### Issue 4: "Unsupported file format" or "Header signature does not match" on Upload
- **Root Cause:** Magic-byte inspection detected a file extension mismatch (e.g., an executable or text file renamed to `.pdf`).
- **Resolution:**
  1. Upload genuine PDF files starting with the `%PDF-` header signature, or genuine JPEG (`\xFF\xD8\xFF`) or PNG (`\x89PNG`) images.
  2. Ensure file size is below the 15 MB statutory limit.

### Issue 5: Flash of Light Theme in Dark Mode (FOUC)
- **Root Cause:** Browser rendering before theme preference is applied.
- **Resolution:**
  - NiyamSetu implements an inline script in `index.html` executing before CSS attachment:
    ```js
    (function () {
      var t = localStorage.getItem('niyamsetu_theme') || 'light';
      document.documentElement.setAttribute('data-theme', t);
      if (t === 'dark') document.documentElement.classList.add('dark');
    })();
    ```
  - Clear browser cache if an outdated `index.html` was cached.

---

## 5. Production Deployment Safeguards

1. **Docker Multi-Stage Isolation:** Production images compile TypeScript assets in isolated builder stages, discarding devDependencies and compiler toolchains from final runtime images.
2. **Zero In-Memory Volatility:** All application drafts, step indices, uploaded document metadata, and stage timers persist directly in PostgreSQL; no state is lost on server restart.
3. **Database Guardrails:** Audit log tables are append-only. State transitions require valid cryptographic hashes linking back to the previous record.
4. **AWS EC2 Preservation:** The standard deployment uses `compose.production.yaml` with Nginx SSL termination and persistent Docker volume mounts. Existing EC2 configurations are preserved.
