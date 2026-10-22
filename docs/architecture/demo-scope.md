# ApprovalSync — Hackathon Demonstration Scope & Evaluator Guide

> **Document Version:** 1.1.0 (Review Correction 02)<br>
> **Status:** AWAITING_REVIEW (Milestone FND-01)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Stakeholders:** M2 (Backend Core & Workflow), M3 (Document AI & Verification), M4 (Frontend & Experience)<br>
> **Target Audience:** Smart India Hackathon Evaluators, Jury Members, AICTE Stakeholders<br>
> **Primary Regulatory Reference:** AICTE Approval Process Handbook (APH) 2024-2027 ([https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf](https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf))<br>
> **Last Updated:** 2026-10-22

---

## 1. Problem Statement & User Personas

### 1.1 Hackathon Problem Statement & Regulatory Context
Every academic year, the All India Council for Technical Education (AICTE) processes over 10,000 institutional applications across diverse categories, including Establishment of New Technical Institutions, Extension of Approval (EoA) for existing institutions, Increase in Intake, and Introduction of Emerging Courses. Regulatory scrutiny of these dossiers requires verifying complex statutory covenants, institutional infrastructure, and land ownership/lease deeds.

To ensure statutory fidelity and avoid confusion during evaluation, ApprovalSync strictly distinguishes between confirmed AICTE statutory requirements and configurable hackathon prototype policies:

1. **Statutory Land Tenure for New Institutions (AICTE APH 2024-27, Chapter 1, Clause 1.4.1):**
   - For establishing a new technical institution on leased land, the land must be held on a registered, irrevocable lease of **at least 30 years total tenure** (with regional exceptions: 15 years in J&K, Ladakh, and North Eastern states, or designated mega/metro regions under specific conditions).
2. **Statutory Live-Lease Rule for Extension of Approval (EoA) (AICTE APH 2024-27, Chapter 1, Clause 1.4.2):**
   - For existing institutions seeking Extension of Approval (EoA), the Council **shall NOT issue an EoA** from the academic year in which the remaining live lease period drops to become **equal to or less than the maximum duration of the program/course** offered by the institution (e.g., $\le 4$ years for a 4-year B.Tech program).
3. **Team-Defined Illustrative Demo Policy (Configurable Demonstration Rule):**
   - Originating in the repository's initial `README.md` (Module D, lines 281-294) as a team-introduced benchmark, an illustrative covenant required a minimum of **25 years unexpired live validity remaining** on 30-year deeds. This requirement has no statutory basis in official AICTE APH 2024-27 and is implemented within ApprovalSync strictly as a **`TEAM-DEFINED ILLUSTRATIVE DEMO POLICY`** (advisory covenant check). It is **explicitly disclaimed as an official statutory AICTE rejection rule for general EoA applications**, ensuring judges and evaluators are not misled.
4. **Fraud Prevention & Integrity:**
   - Preventing submission of forged land conversion orders, altered building plan approvals, or expired deeds through automated OCR extraction, heuristic anomaly detection, and tamper-evident audit logging.
5. **Review Deadlines & SLA Tracking:**
   - Demonstrating turnaround tracking through a configurable scrutiny deadline benchmark (a proposed 15-working-day demo target, unverified as an official statutory deadline under APH 2024-27). In the live demonstration, operational turnaround is demonstrated via an **accelerated demo timer**, explicitly labeled to avoid implying that real statutory deadlines elapse in minutes.
6. **Tamper-Evident Auditability:**
   - A sequential SHA-256 hash chain provides tamper-evidence by detecting modifications relative to previously trusted hash values or checkpoints. It does not, by itself, prevent a privileged database administrator from rewriting historical records and recomputing the chain. Protection against that threat requires an independently controlled trusted checkpoint or external anchor. The demo demonstrates detection of a simulated record modification against the existing chain; it does not claim protection against every privileged attacker.

### 1.2 Target User Personas

| Persona Role | User Entity | Key Responsibilities in System | Primary Interface Views |
|---|---|---|---|
| **Institution Representative** | `INSTITUTION_USER` | Prepares application dossier, uploads title deeds and building approvals, responds to advisory deficiency clarifications. | Application Wizard, Document Upload Queue, Status Tracker, Deficiency Response. |
| **Scrutiny Officer** | `SCRUTINY_OFFICER` | Reviews application completeness, inspects side-by-side AI advisory evidence, verifies land covenants, issues deficiencies or clears cases. | Scrutiny Worklist, Evidence Viewer, Deficiency Composer, Decision Sign-off. |
| **Regional Officer (RO)** | `REGIONAL_OFFICER` | Supervises regional approval queues, monitors SLA breach warnings, approves EVC expert committee rosters. | Regional Bureau Dashboard, SLA Status View, Committee Approvals. |
| **Council Administrator / Auditor** | `COUNCIL_ADMIN` | Configures regulatory rule sets, inspects tamper-evident audit logs, runs cryptographic ledger verifications. | System Health, APH Rule Engine Config, Tamper-Evident Audit Visualizer / CLI. |
| **EVC Expert Inspector** | `EVC_INSPECTOR` | Conducts on-site verification, records geo-tagged infrastructure evidence, submits committee recommendations. | EVC Inspection Workspace, Metric Verification Form, Committee Report Generator. |

---

## 2. Primary End-to-End Demonstration (The 7-Step Golden Path)

The primary live demonstration showcases one coherent, demonstrable end-to-end regulatory review lifecycle—from institutional intake to cryptographic audit verification. Critical-path scope is de-risked by providing simple, reliable fallbacks for all non-essential visual components.

```
+----------------------------------------------------------------------------------------------------+
|                               ApprovalSync 8-Minute Golden Path Workflow                           |
+----------------------------------------------------------------------------------------------------+
  [ 1. Intake & Upload ]   -->   [ 2. OCR & Extraction ]  -->   [ 3. Provider Verification ]
  Institution uploads deed       Pipeline extracts dates        Simulated DigiLocker checks
  and submits application.       and survey coordinates.        synthetic test signature.
                                                                            |
                                                                            v
  [ 6. SLA Alert / Timer ] <--   [ 5. Scrutiny Decision ] <--   [ 4. Compliance Evaluation ]
  Accelerated demo timer fires;  Officer reviews flags &        System checks 30-yr tenure &
  overdue indicator shown.       issues Deficiency Notice.      flags demo covenant shortfall.
            |
            v
  [ 7. Tamper-Evident Audit ]
  Admin runs verifier; altered
  database entry detected.
```

### Step-by-Step Execution Sequence

#### Step 1: Institutional Dossier Submission
- **Actor:** `INSTITUTION_USER` (Dr. S. Raman, Registrar, "Aryabhatta Institute of Technology").
- **User Action:** Logs into institutional portal, navigates to "Extension of Approval (EoA) 2026-27", fills dynamic form (Urban Land Category, Mega-City norm, 2.5 Acres), and uploads `Registered_Lease_Deed_AIT.pdf`.
- **System Behavior:** Ingestion pipeline validates PDF magic bytes (`%PDF-`), enforces 15MB file size limit, creates application envelope in state `DRAFT`, persists binary to local secure storage, and dispatches an asynchronous background processing event via BullMQ.
- **Evidence / Output Shown:** Instant file upload confirmation badge with SHA-256 fingerprint; application transitions to `SUBMITTED`.

#### Step 2: Automated OCR, Classification & Evidence Grounding
- **Actor:** Automated Background Worker (BullMQ + OCR Engine).
- **User Action:** None (asynchronous pipeline).
- **System Behavior:** Worker processes document pages, classifies document as `REGISTERED_LEASE_DEED`, and extracts key fields (`Registration No: 4412/2012`, `Start Date: 2012-05-15`, `Expiry Date: 2044-05-14`, `Survey No: 142/1A`) with provisional confidence scores.
- **Evidence / Output Shown:** Extracted key-value pair payload stored with extraction confidence score ($0.94$).
- **Scope Classification & Fallback:**
  - *Must-Have Core:* Structured tabular key-value summary display listing field names, extracted values, confidence scores, and document page references.
  - *Optional Enhancement:* Interactive canvas bounding-box overlays over PDF preview.
  - *Fallback if Canvas Fails:* Tabular key-value view with direct page jump links.

#### Step 3: Simulated DigiLocker Sandbox Verification (Synthetic Test Certificate)
- **Actor:** External Verification Adapter (`MockDigiLockerProvider`).
- **User Action:** Automatic or officer-triggered verification.
- **System Behavior:** System queries the simulated DigiLocker Gateway using the deed reference. The mock gateway verifies the digital signature against a **locally configured synthetic X.509 test certificate**.
- **Important Semantic Boundary:**
  - This verification proves algorithmic correctness of XMLDSig verification against a configured test keypair.
  - It does **NOT** validate against the Government of India Controller of Certifying Authorities (CCA) root trust anchor.
  - It does **NOT** establish the identity of a real-world institution or certify that an actual physical deed is authentic.
- **Evidence / Output Shown:** UI displays verification status badge:
  `VERIFIED (SIMULATED_DIGILOCKER_SANDBOX)` with note: *"Verified against local synthetic test certificate only"*.

#### Step 4: Regulatory Compliance Evaluation (Statutory Norms vs. Demo Policy)
- **Actor:** Automated Regulatory Compliance Engine.
- **System Behavior:** Evaluates extracted deed dates against statutory formulas and prototype policies:
  1. *Statutory Total Lease Tenure (AICTE APH 2024-27, Clause 1.4.1):*
     $$2044 - 2012 = 32.0\text{ years} \ge 30.0\text{ years} \quad \implies \text{\textbf{COMPLIANT}}$$
  2. *Statutory EoA Live Lease Rule (AICTE APH 2024-27, Clause 1.4.2):*
     Remaining live lease $2044 - 2026 = 18.0\text{ years}$. For a 4-year B.Tech program ($t_{\text{course\_max}} = 4.0\text{ years}$):
     $$18.0\text{ years} > 4.0\text{ years} \quad \implies \text{\textbf{STATUTORILY COMPLIANT FOR EoA}}$$
  3. *Team-Defined Illustrative Demo Policy (Configurable Demo Rule):*
     The team-defined prototype covenant (originating in `README.md` Module D) requires 25.0 unexpired years:
     $$18.0\text{ years} < 25.0\text{ years} \quad \implies \text{\textbf{DEMO POLICY SHORTFALL}}$$
- **Evidence / Output Shown:** System raises an advisory alert clearly distinguishing statutory compliance from the demo policy:
  `[ADVISORY POLICY ALERT — TEAM-DEFINED DEMO RULE]: Deed unexpired validity is 18.0 years, below the configurable prototype benchmark of 25.0 years. (Note: Meets statutory EoA requirement under APH Clause 1.4.2, as remaining tenure exceeds maximum course duration of 4.0 years).`

#### Step 5: Scrutiny Officer Evidence Review & Disposition
- **Actor:** `SCRUTINY_OFFICER` (Er. Anita Sharma, Northern Regional Office).
- **User Action:** Opens Scrutiny Queue, selects Aryabhatta Institute. Inspects evidence panel: left pane shows application form, extracted values, and advisory flags; right pane displays the uploaded deed PDF.
- **System Behavior:** Officer inspects the lease expiry date on the deed, reviews the advisory policy flag, and exercises human statutory discretion. In the demo scenario, the officer issues a clarification directive requesting an updated lease addendum before final sign-off. Officer clicks **"Issue Deficiency Notice"**, typing an official directive. Application atomically transitions to `DEFICIENCY_ISSUED`.
- **Evidence / Output Shown:** Formal Deficiency Notice generated citing the advisory policy benchmark, setting a response deadline.

#### Step 6: Accelerated Demo SLA Timer & Escalation Indicator
- **Actor:** BullMQ Delayed Job Worker & Regional Officer Dashboard.
- **User Action:** Evaluator triggers accelerated demo time advancement (e.g., via CLI script `fast_forward_sla.ts` or test endpoint).
- **Explicit Labeling:**
  `DEMO ACCELERATED TIME (2 minutes elapsed represents a simulated 48-hour statutory response deadline)`.
  This is explicitly declared as synthetic demonstration timing, not an actual statutory elapsed period.
- **System Behavior:** BullMQ timer fires; application status updates to reflect SLA deadline expiration.
- **Scope Classification & Fallback:**
  - *Must-Have Core:* Single overdue deadline indicator / badge (`OVERDUE — DEMO ACCELERATED TIME`) visible upon page load or manual refresh.
  - *Optional Enhancement:* Live Server-Sent Events (SSE) toast push to Regional Officer dashboard.
  - *Fallback if SSE Fails:* Standard page refresh or REST polling showing the updated overdue status badge.
  - *Multi-tier Escalation:* Classified as optional enhancement. Core demo focuses on a single clear breach indicator.

#### Step 7: Tamper-Evident Audit Logging & Cryptographic Detection
- **Actor:** `COUNCIL_ADMIN` / Evaluator.
- **User Action:** Admin opens the **Tamper-Evident Audit Ledger** view. Shows a sequential chain of SHA-256 blocks from application submission to deficiency issuance.
- **System Behavior & Tamper Simulation:**
  - Each audit record stores `previous_hash`, `leaf_hash`, and `current_hash` computed over canonical JSON (RFC 8785).
  - Evaluator executes a simulated data mutation (e.g. updating an application row or invoking `/api/v1/audit/simulate-tamper`).
  - Admin clicks **"Verify Cryptographic Ledger"** (invoking `GET /api/v1/audit/verify`).
- **Technical Guarantees & Threat Boundary:**
  - *What is detected:* The verification recomputes hashes from row 0 to $N$. When row $k$ is modified, its recomputed leaf hash fails to match, and the hash chain breaks at sequence $k+1$.
  - *Precise Threat Boundary:* A sequential SHA-256 hash chain provides tamper-evidence by detecting modifications relative to previously trusted hash values or checkpoints. It does not, by itself, prevent a privileged database administrator from rewriting historical records and recomputing the chain. Protection against that threat requires an independently controlled trusted checkpoint or external anchor. The demo demonstrates detection of a simulated record modification against the existing chain; it does not claim protection against every privileged attacker.
- **Evidence / Output Shown:** Screen highlights altered sequence block:
  `SECURITY ALERT: Tampering detected at Sequence #4! Computed hash does not match stored hash.`
- **Scope Classification & Fallback:**
  - *Must-Have Core:* REST verification endpoint (`GET /api/v1/audit/verify`) returning structured JSON report (`{ "valid": false, "broken_at_sequence": 4 }`) and basic ledger table showing status.
  - *Optional Enhancement:* Interactive SVG/D3 Merkle tree node visualizer.
  - *Fallback if Visualizer Fails:* Structured audit ledger table with pass/fail verification banner.

---

## 3. Scope Classification (MoSCoW Matrix)

To guarantee successful delivery by a 4-person hackathon team, feature scope is strictly partitioned into Must-Have (core evaluator path), Optional Enhancements (with defined fallbacks), Should-Have, Could-Have, and Excluded.

```
+----------------------------------------------------------------------------------------------------+
|                               ApprovalSync Hackathon Feature Scope                                 |
+----------------------------------------------------------------------------------------------------+
| [x] MUST-HAVE (Core Evaluator Path — Guaranteed Deliverable)                                       |
|     - Institutional intake wizard with dynamic APH JSONB fields.                                   |
|     - Secure PDF upload with magic byte checking (%PDF-), 15MB limit, and disk storage.            |
|     - OCR extraction pipeline extracting dates, registration numbers, and survey numbers.          |
|     - Tabular extracted evidence display with page numbers and confidence scores.                  |
|     - Regulatory compliance engine evaluating statutory 30-year lease (Clause 1.4.1), statutory    |
|       EoA course-duration live lease (Clause 1.4.2), and illustrative 25-year demo covenant.       |
|     - Scrutiny officer review queue with advisory flag inspection and human-in-the-loop sign-off.  |
|     - Deterministic FSM state transitions enforced via NestJS RBAC guards and atomic DB commits.   |
|     - Simulated DigiLocker verification adapter with explicit mock badge and synthetic test cert.  |
|     - Tamper-evident audit ledger with PostgreSQL mutation triggers and SHA-256 hash verification.  |
|     - Basic SLA deadline tracking with accelerated demo timer and visual overdue indicator.        |
+----------------------------------------------------------------------------------------------------+
| [o] OPTIONAL ENHANCEMENTS (Polish Items with Concrete Fallbacks)                                   |
|     - Advanced OCR bounding-box canvas overlays.                                                   |
|       --> Fallback: Tabular key-value summary table with direct PDF page jump links.               |
|     - Live Server-Sent Events (SSE) push alerts for SLA notifications.                             |
|       --> Fallback: Standard REST polling or page refresh on status change.                        |
|     - Advanced Merkle tree proof visualizer (interactive node graph).                              |
|       --> Fallback: REST verification endpoint returning structured JSON report + tabular view.     |
|     - Multi-tier SLA escalation (Tier 2 Director / Tier 3 Chairman).                               |
|       --> Fallback: Single-tier overdue status badge with accelerated demo time indicator.         |
|     - Live database SQL tamper script injection during presentation.                               |
|       --> Fallback: Pre-packaged test endpoint or script demonstrating broken hash detection.     |
+----------------------------------------------------------------------------------------------------+
| [ ] SHOULD-HAVE (High-Value Polish If Critical Path Is Stable)                                      |
|     - Automated Deficiency Report PDF generator using server-side PDF templates.                   |
|     - Visual document alteration heuristic (provisional heuristic for compression/font anomalies).  |
|     - Full EVC expert roster randomization and conflict-of-interest declaration UI.                 |
+----------------------------------------------------------------------------------------------------+
| [ ] COULD-HAVE (Stretch Goals)                                                                     |
|     - Satellite GIS cadastral survey boundary cross-check against geo-coordinates.                  |
|     - Automated floor-plan blueprint CAD metric evaluation.                                        |
|     - Video-stream inspection capture with timestamp and GPS watermarking.                         |
+----------------------------------------------------------------------------------------------------+
| [!] OUT OF SCOPE (Strictly Excluded — Do Not Promise to Evaluators)                                 |
|     - Real production credentials or live connections to government DigiLocker/API Setu.          |
|     - Autonomous AI-driven approval or rejection without human officer sign-off.                   |
|     - Unqualified claims of physical WORM or immutable relational database storage.                |
|     - Biometric Aadhaar iris or fingerprint hardware authentication.                               |
|     - Production blockchain deployment with cryptocurrency gas tokens.                             |
|     - Integration with live state-specific land registry databases across all 28 states.            |
+----------------------------------------------------------------------------------------------------+
```

### 3.1 Minimum Viable Demonstration (MVD) & Subsystem Simplifications for a 4-Person Team

To guarantee that the hackathon team delivers a rock-solid, fully testable end-to-end evaluation without execution failure, the demonstration is anchored on a tight **Minimum Viable Demonstration (MVD)** core, preserving the original problem statement intent while adopting practical simplifications for complex subsystems.

#### A. Preserved Minimum Viable Story (Six Core Requirements)
1. **Application Intake:** Submitting a new dossier or selecting a pre-seeded synthetic institutional application.
2. **Document Ingestion & Extraction:** PDF upload with magic byte checking and a clear, comprehensible tabular extraction display.
3. **Traceable Rule Evaluation:** Deterministic rule engine evaluating statutory norms (Clause 1.4.1 total tenure, Clause 1.4.2 EoA course duration) and the team-defined demo covenant.
4. **Human Review Decision:** Authenticated scrutiny officer reviewing evidence and issuing an official disposition (Deficiency Notice or Clearance).
5. **Tamper-Evident Audit History:** Verifiable sequential hash chain showing unbroken application history and detecting simulated row tampering.
6. **Explicit Mock Identification:** Simulated DigiLocker adapter responses prominently and indelibly tagged as mock test data.

#### B. Additional Subsystem Assessment & Simplification Strategies

| Subsystem | Original Role in Concept | Assessment for 4-Person Hackathon Team | Recommended Simplification for Demo |
|---|---|---|---|
| **BullMQ & Redis Queues** | Asynchronous queuing for heavy OCR and delayed SLA timers. | **Implementation Choice.** Essential for preventing HTTP timeouts on 50-page PDFs in production, but introduces Redis operational dependency during live judging. | **Dual-Mode Execution:** Maintain BullMQ worker as primary asynchronous queue, but implement an in-process direct async fallback so that application intake and document extraction function seamlessly even if Redis is stopped or unreachable. |
| **Synthetic XMLDSig Verification** | Simulating DigiLocker digital signature verification on deeds. | **Problem Statement Requirement.** Core to demonstrating government trust fabric integration. | **Lightweight Dedicated Adapter:** Avoid heavyweight W3C XMLDSig canonicalizer dependencies. Implement a clean mock verification adapter that validates the presence, digest, and test certificate of the synthetic XML structure, returning explicit mock metadata (`is_mock: true`). |
| **Cryptographic Hash Chaining** | Tamper-evident ledger for regulatory auditability. | **Problem Statement Requirement.** One of the three core pillars of ApprovalSync. | **Sequential SHA-256 Block Chaining:** Keep sequential SHA-256 block chaining ($H_n = \text{SHA256}(H_{n-1} \parallel \text{LeafHash}_n \parallel \text{Timestamp}_n)$) via native Node `crypto` and a `GET /api/v1/audit/verify` verification endpoint as core Must-Have. Complex Merkle tree visualization graphs are classified as Optional Enhancements; the sequential chain reliably detects modifications relative to previously computed hashes within seconds, while acknowledging that protection against a privileged database administrator requires an independently controlled external trust anchor. |
| **Accelerated SLA Processing** | Tracking Citizen's Charter review turnaround. | **Problem Statement Requirement.** Core feature demonstrating deadline monitoring. | **Single-Tier Overdue Indicator:** Avoid complex multi-tier escalation graphs (Tier 2/3) and live WebSocket/SSE push during judging. Implement a single-tier overdue deadline indicator (`OVERDUE — DEMO ACCELERATED TIME`), triggered via a fast-forward API endpoint (`POST /api/v1/sla/fast-forward`) or test script, visible on page reload. |
| **Advanced Extraction (OCR / CV)** | Automated reading of deeds and plan approvals. | **Problem Statement Requirement.** Document intelligence is central to the project value proposition. | **Side-by-Side Tabular Display:** Avoid complex interactive PDF canvas bounding-box overlays and pixel-level tamper heatmaps (which are fragile across screen resolutions). Core demo presents a structured tabular key-value summary table (Field Name, Extracted Text, Confidence Score, Document Page Reference) alongside a standard PDF preview. Canvas overlays remain an Optional Enhancement. |

---

## 4. Synthetic Demo Dataset

The platform is seeded exclusively with synthetic, realistic institutional profiles. **No real-world personal data, real Aadhaar numbers, or active institutional credentials exist in the system.**

### 4.1 Fictional Institution Profiles

```json
[
  {
    "id": "inst-ait-001",
    "name": "Aryabhatta Institute of Technology",
    "region": "Northern",
    "state": "Uttar Pradesh",
    "city": "Lucknow",
    "category": "Urban",
    "land_area_acres": 2.5,
    "programs": ["ENGINEERING_AND_TECHNOLOGY"],
    "scenario": "ADVISORY_FLAG_DEMO_LEASE_COVENANT"
  },
  {
    "id": "inst-bpi-002",
    "name": "Bharat Polytechnic Institute",
    "region": "Western",
    "state": "Maharashtra",
    "city": "Pune",
    "category": "Metro",
    "land_area_acres": 4.0,
    "programs": ["DIPLOMA_ENGINEERING"],
    "scenario": "FULLY_COMPLIANT_APPROVAL_READY"
  },
  {
    "id": "inst-sct-003",
    "name": "Surya College of Technology & Management",
    "region": "Southern",
    "state": "Karnataka",
    "city": "Bengaluru",
    "category": "Mega",
    "land_area_acres": 1.2,
    "programs": ["MANAGEMENT", "ENGINEERING"],
    "scenario": "SUSPICIOUS_DOCUMENT_ALTERATION"
  }
]
```

### 4.2 Five Targeted Evaluation Scenarios

| Scenario ID | Test Case Title | Seeded Inputs | Expected System Behavior | Judge Demonstration Value |
|---|---|---|---|---|
| **SCN-01** | **Happy Path: Fully Compliant Institution** | Bharat Polytechnic (`inst-bpi-002`); 35-year registered deed executed in 2020; valid synthetic DigiLocker signature. | All APH rules pass green; mock DigiLocker verified; Scrutiny Officer clears application to `RECOMMENDED_FOR_EVC`. | Shows clean end-to-end flow and seamless evidence review. |
| **SCN-02** | **Advisory Policy Flag: Demo Lease Covenant Shortfall** | Aryabhatta Institute (`inst-ait-001`); 32-year deed executed in 2012, expiring in 2044 (18 years remaining). | Compliance engine verifies 30-year statutory tenure and EoA course duration rule; raises advisory flag against 25-year demo covenant; officer reviews and requests addendum. | Demonstrates automated tenure calculation and clear distinction between statutory rules and advisory covenants. |
| **SCN-03** | **Advisory Risk Flag: Suspected Font Alteration** | Surya College (`inst-sct-003`); land conversion certificate with mismatched resolution on parcel number. | Computer vision heuristic flags `POTENTIAL_VISUAL_ALTERATION`; system marks `MANUAL_REVIEW_REQUIRED` (non-accusatory). | Illustrates ethical AI decision-support without premature forgery accusations. |
| **SCN-04** | **Provider Graceful Fallback: Gateway Timeout** | Test application; DigiLocker mock set to timeout mode (`LATENCY_MS: 6000`). | Adapter times out after 5000ms; application cleanly defaults to `SOURCE_UNAVAILABLE`; flags for manual physical verification. | Proves system resilience under third-party API delays. |
| **SCN-05** | **Cryptographic Tamper-Evidence Detection** | Any submitted application; direct database update alters state to `APPROVED`. | Verification endpoint recomputes hash chain; detects broken sequence; highlights exact modified row. | Demonstrates detection of a simulated record modification against the existing hash chain within the documented threat boundary. |

---

## 5. Regulatory & Policy Mapping

To maintain statutory rigor, all automated rules in ApprovalSync are explicitly categorized as confirmed statutory AICTE requirements, Indian statutory acts, or illustrative prototype policies. Official source: [AICTE Approval Process Handbook (APH) 2024-2027](https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf).

| Regulatory Parameter | Exact Requirement / Formula | Source Document & Clause | Status | Category & Scope | Implementation Policy |
|---|---|---|---|---|---|
| **Total Lease Tenure (New Institution)** | Minimum **30 Years** registered, irrevocable lease | AICTE APH 2024-27, Chapter 1, Clause 1.4.1 (p. 26). | **VERIFIED STATUTORY** | Establishment of New Technical Institutions. | Enforced via formula: `(lease_expiry - lease_start) >= 30.0`. |
| **Live Lease Duration (EoA Application)** | Remaining lease period must **exceed maximum duration of program/course** (e.g. $> 4$ years for B.Tech) | AICTE APH 2024-27, Chapter 1, Clause 1.4.2 (p. 27). | **VERIFIED STATUTORY** | Extension of Approval (Existing Institutions). | Enforced via formula: `(lease_expiry - application_date) > max_course_duration`. |
| **25-Year Unexpired Live Lease Covenant** | Minimum **25 Years** remaining from application date | Initial `README.md` (Module D, lines 281-294); unverified in APH 2024-27. | **TEAM-DEFINED ILLUSTRATIVE DEMO POLICY** | Prototype Evaluation Benchmark Only. | Enforced as advisory warning; explicitly labeled as team-defined demo policy, NOT statutory rejection. |
| **Land Registration** | Registered with Sub-Registrar / competent authority | Indian Registration Act 1908 & APH Chapter 1, Clause 1.4. | **VERIFIED STATUTORY** | All Land Covenants. | Mandatory registration number and registrar office extraction. |
| **Scrutiny Turnaround SLA** | 15 Working Days for initial documentary scrutiny (Proposed Target) | Team-Defined Operational Benchmark (Unverified in APH 2024-27). | **PROPOSED DEMO TARGET / UNVERIFIED AS OFFICIAL STATUTORY SLA** | Demonstration Scenario Only. | Configured as 15-day benchmark; demonstrated via explicitly labeled accelerated demo timer. |
| **Clarification Response Deadline** | 48 Hours to submit deficiency response | Hackathon Demonstration Specification. | **ILLUSTRATIVE DEMO POLICY** | Demo Evaluation Benchmark Only. | Configured in `sla_timers` table as demo benchmark. |
| **Accelerated Demo Timer** | 2 minutes presentation time represents 48 hours deadline | Hackathon Demonstration Protocol. | **ILLUSTRATIVE DEMO TIMING** | Presentation Only. | UI and logs explicitly label as `DEMO ACCELERATED TIME`. |
| **Land Area Norms (Mega/Metro/Urban)** | 1.5 - 2.5 Acres depending on regional category | AICTE APH 2024-27, Appendix 4. | **VERIFIED STATUTORY** | Infrastructure Norms. | Parameterized in `rules` JSON schema engine. |

---

## 6. Demo Success Criteria for Hackathon Judges

1. **Deterministic Workflow Execution:** The system demonstrably blocks illegal state transitions (e.g., an applicant cannot jump from `DRAFT` to `APPROVED`).
2. **Accurate Regulatory Extraction:** OCR pipeline extracts dates and registration numbers from a multi-page PDF, displayed in a clear evidence view with confidence scores.
3. **Statutory vs. Policy Clarity:** The platform correctly identifies statutory tenure compliance while flagging an advisory demo covenant shortfall without misrepresenting it as an official AICTE rejection.
4. **Visibly Demarcated Government Trust Integration:** Evaluators observe a simulated DigiLocker XMLDSig verification clearly tagged as `"SIMULATED SANDBOX — SYNTHETIC TEST CERTIFICATE ONLY"`.
5. **Clear SLA Overdue Tracking:** Evaluators observe a visible overdue indicator triggered by an accelerated demo timer, clearly labeled as demo time.
6. **Cryptographic Tamper-Evidence Detection:** An unauthorized database row modification is detected and located relative to the existing hash chain by the verification endpoint.
7. **Human Sovereignty Maintained:** The demo highlights that all statutory determinations (deficiencies, approvals) require authenticated officer sign-offs; AI outputs remain strictly advisory.

---

## 7. 8-Minute Timed Demonstration Script & Fallback Plan

| Elapsed Time | Demonstration Phase | Presenter Narration & Screen Action | Fallback Contingency Plan |
|---|---|---|---|
| **00:00 - 01:15** | **Executive Introduction** | Present problem context: 10,000+ colleges, manual deed verification, risks of fraudulent approvals. Introduce ApprovalSync as an explainable decision-support engine. | Show architectural slide if projector setup is delayed. |
| **01:15 - 02:45** | **Intake & Automated Document AI** | Log in as college user. Upload `Registered_Lease_Deed_AIT.pdf`. Submit application. Show background OCR extracting dates and registration numbers in tabular evidence view. | Pre-seeded completed application available in database if OCR worker experiences local latency. |
| **02:45 - 04:15** | **Simulated Trust Verification & Scrutiny** | Log in as Scrutiny Officer. Open evidence review. Highlight simulated DigiLocker badge (synthetic test certificate). Show system verifying statutory norms and flagging 25-yr demo covenant shortfall. Issue deficiency notice. | Static mock verification response cached in memory if Redis broker is restarted. |
| **04:15 - 05:45** | **Accelerated SLA Timer & Overdue Alert** | Switch to Regional Officer dashboard. Trigger accelerated demo timer script (`fast_forward_sla.ts`). Highlight visible overdue indicator (`OVERDUE — DEMO ACCELERATED TIME`). | Fallback: Refresh page or view SLA status badge directly if live SSE push drops. |
| **05:45 - 07:15** | **Cryptographic Tamper Detection** | Switch to Admin Audit view. Show sequential SHA-256 block chain. Execute simulated row tamper via script or test endpoint. Click "Verify Cryptographic Ledger". System highlights altered sequence block. | Pre-packaged verification test output or demonstration video in `docs/demo/`. |
| **07:15 - 08:00** | **Conclusion & Jury Q&A** | Reiterate core pillars: Human sovereignty, tamper-evident audit logging within clear threat boundaries, and zero fake production claims. Invite evaluator questions. | Open Swagger UI `/api/docs` to demonstrate REST contract compliance. |
