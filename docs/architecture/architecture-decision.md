# ApprovalSync — Architecture Decision & System Design Specification

> **Document Version:** 1.1.0<br>
> **Status:** AWAITING_REVIEW (Milestone FND-01)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Stakeholders:** M2 (Backend Core & Workflow), M3 (Document AI & Verification), M4 (Frontend & Experience)<br>
> **Target Initiative:** Smart India Hackathon (SIH) — Technical Education Regulatory Modernization<br>
> **Last Updated:** 2026-10-22

---

## 1. Context and Architectural Goals

### 1.1 Problem Context & Regulatory Framing
The All India Council for Technical Education (AICTE) oversees the statutory approval, expansion, and compliance lifecycle for thousands of technical colleges and polytechnics across India. The existing approval workflow entails multi-tiered scrutiny:
1. **Initial Documentary Scrutiny:** Verifying institutional identity, land deed registration, building plan approvals, society/trust bylaws, and financial stability.
2. **Expert Visit Committee (EVC):** Physical and video-enabled ground inspection of land area, laboratory equipment, library volumes, and barrier-free facilities.
3. **Standing Hearing Committee (SHC) & Standing Appellate Committee (SAC):** Quasi-judicial hearings evaluating institutional appeals against deficiencies.

Historically, this process has been hindered by manual verification bottlenecks, risks of forged or altered land documents, opaque status transitions, and unmonitored statutory deadlines. ApprovalSync is engineered as an **AI-powered decision-support and workflow automation platform** that validates application dossiers, authenticates document tenure against statutory norms, flags potential anomalies, and provides a **tamper-evident, cryptographically verifiable audit trail**.

#### Regulatory Clarity on Land Lease Norms
To ensure statutory fidelity, the platform distinguishes between confirmed AICTE regulatory norms and configurable prototype policies:
- **Statutory Establishment Norm (AICTE APH 2024-27, Chapter 1, Clause 1.4.1):** For the establishment of a new technical institution on leased land, the land must be held on a registered, irrevocable lease for a **minimum total period of 30 years** (subject to regional relaxations in J&K, Ladakh, and North Eastern states).
- **Statutory Extension of Approval (EoA) Norm (AICTE APH 2024-27, Chapter 1, Clause 1.4.2):** For existing institutions seeking Extension of Approval (EoA), the Council **shall NOT issue an EoA** from the academic year in which the remaining live lease period drops to become **equal to or less than the maximum duration of the program/course** offered by the institution (e.g., $\le 4$ years for a 4-year B.Tech program).
- **Team-Defined Illustrative Demo Policy (Configurable Rule):** Originating in the repository's initial `README.md` (Module D, lines 281-294) as a team-introduced benchmark, an illustrative covenant required a minimum of 25 years unexpired live validity remaining on 30-year deeds. This requirement has no statutory basis in official AICTE APH 2024-27 and is classified strictly within ApprovalSync as a **`TEAM-DEFINED ILLUSTRATIVE DEMO POLICY`** with configurable thresholds, **not as an official statutory AICTE rejection criterion for EoA applications**.

### 1.2 Core Architectural Principles
- **Explainable Decision Support (Human-in-the-Loop):** AI models, OCR extractors, and perceptual analysis engines act strictly as advisory assistants. The system **never** executes autonomous statutory approvals or rejections. Final legal authority remains exclusively with designated human scrutiny officers and regional directors.
- **Hackathon Execution Pragmatism:** Given the 4-person team structure, shared `main` repository protocol, and intense competition timeline, architectural complexity must be minimized. Over-engineering with distributed microservices, service meshes, or distributed event streaming (Kafka) introduces fatal integration friction.
- **Cryptographic Tamper-Evidence:** Regulators require transparent verification that historical application records and officer dispositions have not been quietly modified in the database. A sequential SHA-256 hash chain provides tamper-evidence by detecting modifications relative to previously trusted hash values or checkpoints. It does not, by itself, prevent a privileged database administrator from rewriting historical records and recomputing the chain. Protection against that threat requires an independently controlled trusted checkpoint or external anchor. The demo demonstrates detection of a simulated record modification against the existing chain; it does not claim protection against every privileged attacker.
- **Deterministic State Integrity:** Finite State Machine (FSM) guards ensure applications traverse statutory stages strictly in accordance with Council regulations, preventing stage-bypassing or unauthorized status mutations.
- **Clean Seams for Production Scalability:** While packaged as a modular monolith for a single-node, multi-container demonstration, modular boundaries adhere to Domain-Driven Design (DDD) to enable straightforward extraction into distributed microservices post-hackathon if scaling demands it.

---

## 2. Resolving the Monolith vs. Microservices Conflict

### 2.1 The Architectural Discrepancy
The repository's initial documents exhibited an architectural conflict:
- **`README.md`** advocated a "Decoupled Event-Driven Microservices" topology with 5+ distinct services communicating over HTTP/REST and Redis pub/sub.
- **`PROJECT_STATE.md`** (Section 6) mandated: *"Prefer a modular monolith for a hackathon over deploying many independent microservices; modules may have clean boundaries and async jobs without unnecessary distributed complexity."*

### 2.2 Trade-off Evaluation Matrix

| Architectural Dimension | Multi-Container Microservices | Modular Monolith (Selected) | Impact on Hackathon / Demo |
|---|---|---|---|
| **Development Velocity** | Low (requires managing 5 repos/packages, shared DTO synchronization, complex Docker configs) | **High** (single codebase, instant TypeScript refactoring, shared types) | Critical: 4 developers can iterate rapidly on shared contracts. |
| **Transaction Consistency** | Distributed (requires 2-Phase Commit or Saga orchestrators with compensation logic) | **Atomic ACID** (single DB transaction spans application state update and audit block generation) | Critical: Audit hash-chain cannot fork due to partial network failures. |
| **Operational Overhead** | High (5+ running Node instances, inter-service networking, service discovery, distributed tracing) | **Minimal** (1 backend container, 1 frontend container, PostgreSQL, Redis) | Critical: Reliable local demo on developer laptops without memory exhaustion. |
| **Debugging & Observability** | Complex (correlating distributed logs across containers, async failure modes) | **Straightforward** (single unified stack trace, structured JSON logs with Request ID) | High: Rapid root-cause analysis during live evaluation. |
| **Failure Modes** | Network partitions, cascading timeouts, inter-service circuit breaking | In-process function invocation, zero internal network failure modes | Critical: Zero chance of "service A couldn't reach service B" during judging. |
| **Future Extensibility** | Already decoupled | Modules decoupled via NestJS DI and event emitter interfaces; cleanly extractable | Monolith modules can be migrated to standalone microservices if load demands. |

### 2.3 The Architectural Decision
**We formally select the Modular Monolith architecture implemented within a single NestJS application.**

The system will run as a cohesive, modular backend container with strict domain encapsulation, backed by PostgreSQL 16 (relational tables + indexed JSONB for flexible forms), Redis 7 with BullMQ (for durable background jobs such as OCR extraction and SLA deadline timers), and a React 18 / Vite single-page application.

```
+----------------------------------------------------------------------------------------------------+
|                                    ApprovalSync Core Ecosystem                                     |
+----------------------------------------------------------------------------------------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
     +---------------------------+                   +---------------------------+
     |   API & Workflow Core     |                   |    Background Scheduler   |
     |        (NestJS API)       |                   |      (BullMQ Worker)      |
     +-------------+-------------+                   +-------------+-------------+
                   |                                               |
                   | In-Process Modular Boundaries                 | Durable Job Processing
                   v                                               v
     +---------------------------+                   +---------------------------+
     |   State Machine Engine    |                   |   Hierarchical SLA Engine |
     | - Transition Validators   |                   | - Tier 1 RO Alert         |
     | - RBAC Guard Resolvers    |                   | - Tier 2 Director Escal.  |
     | - Atomic DB Locks         |                   | - Accelerated Demo Timers |
     +-------------+-------------+                   +-------------+-------------+
                   |                                               |
                   | SHA-256 Block Chaining                        | Midnight Cron / Queue
                   v                                               v
     +---------------------------+                   +---------------------------+
     | Tamper-Evident Audit Core |                   | Compliance & Lease Daemon |
     | - RFC 8785 Canonicalizer  |                   | - 30-Year Lease Verifier  |
     | - RFC 6962 Merkle Hash    |                   | - Live Validity Evaluator |
     | - Tamper Detection Engine |                   | - Deficiency PDF Engine   |
     +-------------+-------------+                   +-------------+-------------+
                   |                                               |
                   +-----------------------+-----------------------+
                                           |
                                           v
                   +-----------------------------------------------+
                   |       PostgreSQL 16 Enterprise Cluster        |
                   |   - JSONB Dynamic Approval Forms + GIN        |
                   |   - Tamper-Evident Append-Only Audit Table    |
                   |   - Relational Envelopes & SLA State Tables   |
                   +-----------------------------------------------+
```

---

## 3. Architecture and Module Boundaries

### 3.1 Domain Module Breakdown & Ownership

```
backend/src/
├── core/                  [M1/M2] Base infrastructure, global filters, interceptors, Swagger
├── auth/                  [M2]    Authentication, JWT issuing, bcrypt, session invalidation
├── users/                 [M2]    User entities, roles (Institution, Scrutiny, RO, Admin)
├── applications/          [M2]    Application CRUD, dynamic JSONB schema, intake envelope
├── workflow/              [M2]    Deterministic FSM, transition matrix, stage history
├── rules/                 [M2]    Regulatory rules engine, APH versioning, checklist validation
├── audit/                 [M2]    Tamper-evident audit ledger, RFC 6962 hashing, Merkle verifier
├── sla/                   [M2]    BullMQ timers, escalation daemon, notification dispatcher
├── undertakings/          [M2]    Statutory lease validator (30-yr deed / live covenant checks)
├── documents/             [M3]    Multipart upload pipeline, magic bytes, storage abstraction
├── verification/          [M3]    External verification engine, adapter interfaces, mock gateway
├── compliance/            [M3]    Infrastructure compliance assist, floor plan / metric review
├── ai/                    [M3]    OCR extraction, document classification, bounding-box evidence
└── shared/contracts/      [Frozen] Common DTOs, Enums, Type definitions (M1-M4)
```

### 3.2 Module Responsibilities & Dependencies

| Module | Primary Owner | Inbound Dependencies | Outbound Dependencies | Key Responsibilities |
|---|---|---|---|---|
| `core` | M1 / M2 | All modules | None | Global exception filters, logging interceptor, OpenAPI bootstrap, config service. |
| `auth` | M2 | Controllers | `users` | Issue and verify access tokens; enforce `@Roles(...)` RBAC metadata. |
| `users` | M2 | `auth`, `applications` | `database` | Manage user profiles, institutional affiliations, regional jurisdiction mapping. |
| `applications` | M2 | `workflow`, `documents` | `users`, `audit` | Store application envelopes, manage dynamic APH JSONB fields with GIN indexes. |
| `workflow` | M2 | `applications`, `sla` | `audit`, `rules` | Atomic state transitions; enforce state transition graph; prevent stage bypassing. |
| `rules` | M2 | `workflow`, `compliance` | `database` | Store versioned statutory rules (APH 2024-27); evaluate numerical thresholds. |
| `audit` | M2 | `workflow`, `documents` | `database` | Compute canonical SHA-256 chained hashes; generate Merkle audit proofs. |
| `sla` | M2 | `workflow` | `applications`, Redis | Schedule BullMQ durable delay jobs; trigger escalation notifications. |
| `undertakings` | M2 | `workflow` | `applications` | Evaluate lease tenure ($t_{tenure} \ge 30$) and live validity against statutory/demo thresholds. |
| `documents` | M3 | `applications` | Disk/S3 | Ingest multi-page PDFs; validate MIME/magic bytes; store binary files safely. |
| `verification` | M3 | `workflow`, `documents` | Mock DigiLocker | Query external adapters; verify digital signatures; map verification status. |
| `compliance` | M3 | `documents`, `rules` | `applications` | Assist inspection review; detect contradictory documentary evidence. |
| `ai` | M3 | `documents` | Worker threads | Execute OCR; extract key-value pairs with provisional confidence scores. |
| `frontend` | M4 | Users via Browser | Backend REST API | React 18 SPA; role-based portals; visual FSM tracker; document evidence viewer. |

---

## 4. Data and Trust Boundaries

### 4.1 Conceptual Entity-Relationship Model

```
+--------------------+        1:N        +-------------------------+
|    institutions    |<------------------|      applications       |
| id, name, reg_no   |                   | id, state, payload_jsonb|
+--------------------+                   +-------------------------+
          ^                                       |          |
          | 1:N                               1:N |          | 1:N
+--------------------+                            v          v
|       users        |                   +------------+  +--------------------+
| id, email, role    |                   | documents  |  |     sla_timers     |
+--------------------+                   | id, uri    |  | id, stage, tier    |
                                         +------------+  +--------------------+
                                                |                   |
                                            1:1 |               1:N |
                                                v                   v
                                     +--------------------+  +--------------------+
                                     | document_analysis  |  |     audit_logs     |
                                     | ocr, flags, score  |  | seq, hash, merkle  |
                                     +--------------------+  +--------------------+
```

### 4.2 Authoritative vs. Derived Data
- **Authoritative Data (Legally Binding Records):**
  - Application submission payload (`applications.payload_jsonb`).
  - Officer dispositions and scrutiny review comments (`scrutiny_reviews.decision`).
  - Digital signatures from official government identity providers (`compliance_undertakings.xmldsig_verified`).
  - Audit trail event records (`audit_logs.leaf_hash`).
- **Derived Advisory Data (Non-Binding Signals):**
  - OCR extracted text and confidence scores (`document_analysis.extracted_data`).
  - Computer vision anomaly and alteration heatmaps (`document_analysis.anomaly_flags`).
  - Automated compliance checklist suggestions (`document_analysis.suggested_deficiencies`).

### 4.3 Tamper-Evident Audit Logging & Cryptographic Verification Boundaries

To maintain technical accuracy, ApprovalSync makes explicit distinctions across three protection tiers:

1. **Tier 1: Application-Level Mutation Defense:**
   - Routine application code cannot modify committed audit records. A database trigger (`trg_audit_logs_no_mutation`) intercepts and raises exceptions on `UPDATE` and `DELETE` queries against `audit_logs`.
   - *Limitation:* A database superuser or an attacker with raw database credentials can disable triggers (`ALTER TABLE audit_logs DISABLE TRIGGER ALL`) or modify underlying storage.

2. **Tier 2: Tamper-Evidence Detection via Hash Chaining:**
   - Each audit log entry is linked to its predecessor via SHA-256 block chaining:
     $$H_n = \text{SHA256}(H_{n-1} \parallel \text{LeafHash}_n \parallel \text{Timestamp}_n)$$
   - The leaf hash is computed over canonical JSON (RFC 8785) containing the application ID, sequence number, actor ID, actor role, event type, and payload snapshot:
     $$\text{LeafHash}_n = \text{SHA256}(\text{Canonicalize}(\text{Payload}_n))$$
   - *Detection Capability:* If an adversary modifies a historical row $k$ in the database, the stored hash $H_k$ will no longer match the recomputed hash, and the chain breaks at block $k+1$. A sequential SHA-256 hash chain provides tamper-evidence by detecting modifications relative to previously trusted hash values or checkpoints.
   - *Threat Boundary Limitation:* A sequential hash chain within the database does not, by itself, prevent a privileged database administrator from rewriting historical records and recomputing the chain. Protection against that threat requires an independently controlled trusted checkpoint or external anchor. The demo demonstrates detection of a simulated record modification against the existing chain; it does not claim protection against every privileged attacker.

3. **Tier 3: Independent Trust Anchor & Checkpoints (Production Boundary):**
   - In production, periodic Merkle tree root hashes ($R_t$) must be signed by an authorized Council key and exported to an independently controlled external trust anchor (e.g., external append-only transparency log or time-stamping authority).
   - *Hackathon Scope:* For the SIH demonstration, the system verifies the integrity of the existing sequential hash chain and demonstrates detection of an altered row via `GET /api/v1/audit/verify`. Independent external trust anchoring remains a future enterprise dependency. Claims of physical immutability or WORM storage are explicitly disclaimed.

---

## 5. Integration Strategy & Signature Semantics

```
                                [ ApprovalSync System ]
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
      [ Mock Gateway (Local) ]                            [ Future API Seams ]
      - Simulated DigiLocker OAuth2                       - Real MeitY DigiLocker API
      - Synthetic XMLDSig Signer                          - State Land Records
      - Synthetic Land Registry                           - AICTE Legacy Portals
      (Local Sandboxed Adapter)                           (Documented Interfaces)
```

### 5.1 Clarifying Digital-Signature and Mock-Provider Semantics
To prevent misleading evaluators, the platform adheres to strict semantic boundaries:
1. **Synthetic Signature Verification:** The demo adapter verifies signatures against a **locally configured synthetic X.509 test certificate**, NOT against the official Controller of Certifying Authorities (CCA) India root trust anchor.
2. **Non-Equivalence to Official Verification:** A successful synthetic signature verification proves that the cryptographic verification algorithm functions correctly against a test keypair. It **does NOT** establish the identity of a real-world institution or prove that an actual physical document is genuine.
3. **Mandatory Interface Tagging:** Every response from the mock adapter and every UI badge must display:
   ```json
   {
     "provider": "SIMULATED_DIGILOCKER_SANDBOX",
     "is_mock": true,
     "verification_scope": "SYNTHETIC_TEST_CERTIFICATE_ONLY"
   }
   ```
4. **Adapter Status & Failure States:**
   - `VERIFIED_MOCK`: Signature cryptographically valid against configured test key.
   - `INVALID_SIGNATURE`: Digest mismatch or corrupted XML.
   - `UNTRUSTED_ISSUER`: Certificate not issued by the configured test CA.
   - `SOURCE_UNAVAILABLE`: Network timeout (5000ms limit) or simulated 500 error.
   - `MANUAL_REVIEW_REQUIRED`: Inconclusive output or missing digital signature.

---

## 6. Technology Decisions and Trade-offs

| Domain | Selected Technology | Evaluated Alternatives | Rationale | Trade-offs & Risks |
|---|---|---|---|---|
| **Backend Framework** | **NestJS 10 (TypeScript 5.3)** | Express, Fastify, Go Gin | Enterprise modular architecture, dependency injection, native class-validator DTOs, built-in OpenAPI. | Slightly higher boilerplate than Express; mitigated by CLI generators. |
| **Runtime Environment** | **Node.js 20 LTS** | Node.js 22 Current | LTS stability, guaranteed compatibility with crypto, canvas, and native Sharp/Tesseract bindings. | Host developer laptop has Node 22; Docker pinning guarantees identical runtime. |
| **Frontend Framework** | **React 18 + Vite** | Next.js 14, Angular | Fast client-side bundling, instant HMR, lightweight SPA architecture suitable for judge demo. | No SSR; unnecessary for an authenticated institutional dashboard. |
| **Primary Database** | **PostgreSQL 16** | MongoDB, MySQL | Relational integrity for state machine + JSONB GIN indexing for flexible APH application forms. | JSONB schema evolution requires disciplined DTO validation at the API layer. |
| **Background Processing** | **Redis 7 + BullMQ** | RabbitMQ, In-memory, Kafka | Persistent, durable task queues, delayed jobs for SLA timers, exponential backoff retries. | Adds Redis dependency to Docker Compose topology. |
| **API Conventions** | **REST + OpenAPI 3.0** | GraphQL, gRPC | Standardized HTTP semantics, automatic Swagger generation, clean contract generation for React frontend. | Multiple round-trips for complex dashboards; mitigated by composite views. |
| **Real-Time Push** | **Server-Sent Events (SSE)** | WebSockets, Polling | Simpler unidirectional push for SLA alerts; falls back cleanly to REST polling. | SSE connection drops on network reset; client handles reconnection. |
| **Audit Ledger Hashing** | **Node.js Crypto (SHA-256)** | Custom blockchain, Hyperledger | RFC 6962 / RFC 8785 compliant hashing without distributed consensus overhead; zero external token cost. | Requires database triggers and external checkpoints to deter privileged DBA attacks. |
| **Containerization** | **Docker Compose v2** | Kubernetes, Nomad | Single command (`docker compose up`) reproducible startup on any judge or developer workstation. | Not designed for multi-region clustering; ideal for hackathon evaluation. |

---

## 7. Architecture Decision Records (ADRs)

### ADR-001: Adoption of Modular Monolith Architecture
- **Status:** APPROVED
- **Context:** `README.md` proposed microservices, while `PROJECT_STATE.md` mandated a modular monolith.
- **Decision:** Build a single NestJS backend structured into cohesive domain modules with in-process event communication.
- **Alternatives Rejected:** Microservices with API Gateway (rejected due to deployment complexity and network latency risks).
- **Consequences:** Eliminates distributed transaction failures; enables atomic database commits; simplifies local testing.
- **Reconsideration Trigger:** Institutional deployment exceeding 100,000 concurrent submissions requiring independent scaling of OCR workers.

### ADR-002: Dual Processing Model (Sync Transitions + Async Background Queues)
- **Status:** APPROVED
- **Context:** OCR extraction and SLA deadline tracking cannot block synchronous HTTP request threads.
- **Decision:** Application CRUD, user authentication, and FSM stage transitions execute synchronously within PostgreSQL transactions. Document OCR, visual anomaly heuristics, and delayed SLA timers execute asynchronously via BullMQ on Redis.
- **Alternatives Rejected:** Purely synchronous processing (would cause HTTP 504 timeouts on 50-page PDF uploads); Kafka (rejected for operational overhead).
- **Consequences:** Requires Redis in the deployment topology; UI can fall back to standard REST polling if SSE is unavailable.
- **Reconsideration Trigger:** None; essential for resilient file ingestion.

### ADR-003: Pluggable Adapter Pattern with Visibly Demarcated Simulation
- **Status:** APPROVED
- **Context:** Official MeitY DigiLocker and State Land Record API credentials cannot be legally obtained for a student hackathon.
- **Decision:** Implement an abstract `VerificationProvider` interface. Deliver `MockDigiLockerProvider` for the demo returning signed synthetic XML, while providing a clean production adapter seam. All responses explicitly declare `"is_mock": true` and note verification against a synthetic test certificate.
- **Alternatives Rejected:** Hardcoding simulated responses inside business controllers; claiming live government connectivity.
- **Consequences:** Evaluators see realistic verification workflows without security or legal risks.
- **Reconsideration Trigger:** Formal receipt of AICTE sandbox credentials during subsequent implementation phases.

### ADR-004: Advisory-Only AI Findings and Statutory Human Sovereignty
- **Status:** APPROVED
- **Context:** AI models can hallucinate, misinterpret degraded scans, or produce false positives on altered fonts.
- **Decision:** AI document classification, OCR extraction, and visual anomaly scores are labeled strictly as `ADVISORY_FLAG`. The system is architecturally prohibited from triggering automatic approval or rejection. State transitions require authenticated human role signatures.
- **Alternatives Rejected:** Autonomous approval for high-confidence documents (legally invalid under AICTE Act 1987).
- **Consequences:** Scrutiny officers retain statutory decision-making authority; every flag must link to page and bounding-box coordinates for human verification.
- **Reconsideration Trigger:** Explicit statutory amendment by AICTE Council permitting automated triage.

### ADR-005: Cryptographic Tamper-Evident Audit Logging
- **Status:** APPROVED
- **Context:** Regulators require assurance that approved records or scrutiny dispositions have not been quietly modified in the database.
- **Decision:** Every workflow transition and verification action appends a record to `audit_logs`. The table is protected by a database trigger preventing `UPDATE` and `DELETE`. Each entry stores `previous_hash`, `leaf_hash`, and `current_hash` based on canonical JSON serialization (RFC 8785). A Merkle tree verification endpoint allows re-calculating roots and detecting altered rows.
- **Boundary Limitation Acknowledged:** This mechanism detects modification of individual rows within the database, but does not prevent a privileged database administrator with raw write access from recalculating the entire chain without an independent external trust anchor.
- **Alternatives Rejected:** Unqualified claims of physical WORM storage (technically inaccurate for relational databases); public blockchain (costly gas fees, public disclosure of confidential college data).
- **Consequences:** Zero runtime gas cost; verifiable tamper detection against an existing hash chain; clear threat boundary documentation acknowledging that defense against privileged database administrators requires an independent external trust anchor.
- **Reconsideration Trigger:** Mandate by Ministry of Education to anchor daily Merkle roots into a National Blockchain ledger.

### ADR-006: Runtime Pinning to Node.js 20 LTS via Alpine Multi-Stage Containers
- **Status:** APPROVED
- **Context:** Local developer workstation runs Node.js `v22.14.0`, whereas enterprise deployment targets Node.js `20 LTS`.
- **Decision:** Standardize all development and production Docker containers on `node:20-alpine`. The TypeScript compiler target will remain `ES2022` to ensure consistent execution regardless of host OS version.
- **Alternatives Rejected:** Developing directly on host Node 22 without containerization (risks "works on my machine" failures during evaluation).
- **Consequences:** Guarantees cryptographic library consistency and stable native bindings across Windows, macOS, and Linux.
- **Reconsideration Trigger:** Node.js 20 reaching end-of-life (April 2026).
