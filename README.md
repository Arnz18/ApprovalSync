# ApprovalSync: AICTE Workflow Automation Platform
### Next-Generation Orchestration Engine for Council Approvals (Scrutiny, EVC, SHC)

[![Architecture: Microservices](https://img.shields.io/badge/Architecture-Event--Driven%20Microservices-blue.svg)](#system-architecture)
[![Backend: NestJS](https://img.shields.io/badge/Backend-NestJS%20%7C%20TypeScript-red.svg)](https://nestjs.com/)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016%20JSONB-336791.svg)](https://www.postgresql.org/)
[![Audit: Merkle Tree RFC 6962](https://img.shields.io/badge/Audit-Cryptographic%20SHA--256%20Chains-brightgreen.svg)](#module-b-cryptographic-audit-trail-merkle-trees)
[![Integration: DigiLocker OAuth2](https://img.shields.io/badge/Integration-DigiLocker%20XMLDSig-orange.svg)](#module-e-digilocker-oauth-20-integration)
[![Compliance: AICTE APH](https://img.shields.io/badge/Compliance-AICTE%20Approval%20Process%20Handbook-purple.svg)](#module-d-undertaking--lease-validity-tracker)

---

## Executive Summary

**ApprovalSync** is a cloud-native, tamper-evident workflow automation platform engineered specifically for the **All India Council for Technical Education (AICTE)** under the **Smart India Hackathon**. The platform modernizes and enforces the multi-tier regulatory approval lifecycle for technical institutions across India—seamlessly governing **Scrutiny**, **Expert Visit Committee (EVC)**, and **Standing Hearing Committee (SHC)** stages.

The system replaces legacy, opaque processes with:
1. **Mathematical Workflow Enforcement:** A deterministic Finite State Machine (FSM) preventing stage bypassing or unauthorized status mutations.
2. **Cryptographic Tamper-Evidence:** An append-only audit trail implementing RFC 6962 compliant SHA-256 hash chaining and Merkle trees to detect rogue database modifications.
3. **Durable SLA Orchestration:** Real-time multi-tier hierarchical escalations (Tier 1/2/3) guaranteeing adherence to Citizen's Charter and administrative deadlines.
4. **Automated Regulatory Compliance:** Automated document tenure verification (enforcing minimum 25-year live lease covenants from 30-year deeds) and instant Deficiency Report generation.
5. **Government API Trust Fabric:** Direct integration with DigiLocker Requester APIs utilizing XMLDSig cryptographic signature verification for zero-fraud institution validation.

---

## Table of Contents

- [1. System Architecture](#1-system-architecture)
  - [Architectural Topology](#architectural-topology)
  - [Technology Stack Justifications](#technology-stack-justifications)
  - [Dynamic APH Schema via PostgreSQL JSONB](#dynamic-aph-schema-via-postgresql-jsonb)
  - [State Machine Architecture](#state-machine-architecture)
- [2. Core Module Implementations](#2-core-module-implementations)
  - [Module A: State Machine Orchestrator](#module-a-state-machine-orchestrator)
  - [Module B: Cryptographic Audit Trail (Merkle Trees)](#module-b-cryptographic-audit-trail-merkle-trees)
  - [Module C: SLA Timer & Hierarchical Escalation Engine](#module-c-sla-timer--hierarchical-escalation-engine)
  - [Module D: Undertaking & Lease Validity Tracker](#module-d-undertaking--lease-validity-tracker)
  - [Module E: DigiLocker OAuth 2.0 & XMLDSig Integration](#module-e-digilocker-oauth-20--xmldsig-integration)
- [3. Database Schema Blueprint](#3-database-schema-blueprint)
  - [Entity-Relationship Diagram](#entity-relationship-diagram)
  - [Production DDL Schemas & Indexing Strategies](#production-ddl-schemas--indexing-strategies)
- [4. Repository Directory Layout](#4-repository-directory-layout)
- [5. Deployment Strategy & Docker Setup](#5-deployment-strategy--docker-setup)
  - [Docker Compose Topology](#docker-compose-topology)
  - [Environment Variables Configuration](#environment-variables-configuration)
- [6. Hackathon Evaluation Demo Script](#6-hackathon-evaluation-demo-script)
  - [Proof 1: FSM Blocking Illegal State Transitions](#proof-1-fsm-blocking-illegal-state-transitions)
  - [Proof 2: Merkle Hash-Chain Tamper Detection](#proof-2-merkle-hash-chain-tamper-detection)
  - [Proof 3: Live SLA Breach & Multi-Tier Escalation Alert](#proof-3-live-sla-breach--multi-tier-escalation-alert)

---

## 1. System Architecture

### Architectural Topology

ApprovalSync uses a decoupled, event-driven microservices architecture containerized via Docker. The architecture isolates the high-throughput REST API gateway, the transactional state machine workflow core, the background cron/queue workers, and the cryptographic audit ledger.

```
                    +-------------------------------------------------------------+
                    |                      Client Layer                           |
                    |   (React 18 + Vite SPA, TailwindCSS, SSE Client Dashboard)  |
                    +------------------------------+------------------------------+
                                                   | HTTPS / WSS
                                                   v
                    +-------------------------------------------------------------+
                    |                 API Gateway & Edge Layer                    |
                    |         (Reverse Proxy, JWT Auth Guard, Rate Limiting)      |
                    +------------------------------+------------------------------+
                                                   |
              +------------------------------------+------------------------------------+
              |                                    |                                    |
              v                                    v                                    v
+-----------------------------+      +-----------------------------+      +-----------------------------+
|    Application Service      |      |   Workflow & FSM Service    |      | Cryptographic Audit Ledger  |
| - APH Dynamic JSONB Store   |      | - Finite State Orchestrator |      | - RFC 6962 Merkle Leaves    |
| - DigiLocker OAuth2 Client  |      | - Transition Guards & RBAC  |      | - SHA-256 Chained Blocks    |
| - Document Ingestion API    |      | - Stage Dispatcher Engine   |      | - Tamper Detection Verifier|
+--------------+--------------+      +--------------+--------------+      +--------------+--------------+
               |                                    |                                    |
               +------------------------------------+------------------------------------+
                                                    |
                                                    v
                      +---------------------------------------------------------+
                      |               Asynchronous Message Bus                  |
                      |            (Redis Pub/Sub & BullMQ Engine)              |
                      +-----------------------------+---------------------------+
                                                    |
                               +--------------------+--------------------+
                               |                                         |
                               v                                         v
              +----------------------------------+     +----------------------------------+
              |     SLA Escalation Worker        |     |     Compliance & Lease Worker    |
              | - Hierarchical Timer Checkers    |     | - 30-Year Lease Expiry Auditing  |
              | - Tier 1, 2, 3 Alert Dispatchers |     | - Auto Deficiency PDF Generator  |
              | - Real-time SSE Push Engine      |     | - Cron Scheduler (Midnight IST)  |
              +----------------+-----------------+     +----------------+-----------------+
                               |                                        |
                               +--------------------+-------------------+
                                                    |
                                                    v
                      +---------------------------------------------------------+
                      |               Data Persistence Layer                    |
                      |         PostgreSQL 16 Enterprise Cluster                |
                      |  - Relational Core Tables (States, Roles, SLA, Leases)  |
                      |  - GIN-Indexed JSONB Dynamic APH Form Documents         |
                      |  - Immutable WORM Append-Only Cryptographic Audit Logs  |
                      +---------------------------------------------------------+
```

### Technology Stack Justifications

| Component | Technology | Rationale & Enterprise Justification |
| :--- | :--- | :--- |
| **Backend Runtime** | **NestJS 10.x / Node.js 20 LTS** | Enterprise TypeScript framework providing strict dependency injection, modular domain boundaries, native microservice transports, robust OpenAPI generation, and seamless integration with type-safe ORMs (Prisma/TypeORM). |
| **Primary Database** | **PostgreSQL 16** | ACID compliance, transactional integrity (`SERIALIZABLE` level for audit blocks), row-level locks (`SELECT ... FOR UPDATE`), and superior native `JSONB` support with generalized inverted indexing (GIN). |
| **Dynamic Form Store** | **PostgreSQL `JSONB` + GIN** | AICTE Approval Process Handbooks (APH) revise field schemas annually (intake quotas, laboratory square meters, land norms). Relational migration overhead is eliminated while retaining indexed sub-document querying. |
| **Workflow State Machine**| **Deterministic FSM Engine** | Encapsulated state transition graph preventing unlawful bypasses. States, events, and side-effects are decoupled from controllers. |
| **Queue & Scheduling** | **BullMQ + Redis 7** | Durable, persistent distributed task scheduler for SLA timers, delayed jobs, retries, and high-volume background deficiency processing with sub-second resolution. |
| **Cryptographic Engine** | **Node.js Crypto / Libsodium** | Hardware-accelerated SHA-256 primitives for Merkle tree generation, continuous leaf hashing, and public key verification for XMLDSig. |
| **Frontend Platform** | **React 18 / Vite / TypeScript** | High-performance single page application featuring real-time Server-Sent Events (SSE) for SLA alerts, visual state transition trackers, and dynamic APH JSON schema form renderers. |

### Dynamic APH Schema via PostgreSQL JSONB

AICTE's Approval Process Handbook changes continuously: norms for faculty-student ratios, land categorization (Mega/Metro/Urban/Rural), and program infrastructure vary based on the engineering discipline or polytechnic guidelines. 

ApprovalSync solves this via a hybrid schema model:
* **Relational Envelopes:** Application ID, Institute Code, Current Status, SLA Timers, and Timestamps are strongly typed relational columns to ensure referential integrity and fast foreign-key joins.
* **`JSONB` Application Payload:** Structural details, land coordinates, building blueprints, laboratory inventories, and faculty rosters are stored in `applications.payload_data JSONB`.
* **Sub-Path Indexing:** Accelerated via GIN (`jsonb_path_ops`) and functional expression indices:
  ```sql
  CREATE INDEX idx_applications_payload_land_area 
  ON applications USING gin ((payload_data -> 'land_details') jsonb_path_ops);
  ```

### State Machine Architecture

Every application registered on ApprovalSync is governed by a strict, finite set of transitions. No database write can directly alter the `current_state` column without passing through the state machine validation pipeline.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Institute Submits Initial Draft
    DRAFT --> SCRUTINY_PENDING : Final Submission & Payment
    
    state "Scrutiny Stage" as Scrutiny {
        SCRUTINY_PENDING --> SCRUTINY_IN_PROGRESS : Scrutiny Officer Assigned
        SCRUTINY_IN_PROGRESS --> SCRUTINY_DEFICIENT : Document Deficiencies Detected
        SCRUTINY_DEFICIENT --> SCRUTINY_IN_PROGRESS : Institute Uploads Rectification
        SCRUTINY_IN_PROGRESS --> SCRUTINY_APPROVED : All Documents Cleared
        SCRUTINY_IN_PROGRESS --> SCRUTINY_REJECTED : Irrevocable Violations
    }

    state "Expert Visit Committee (EVC) Stage" as EVC {
        SCRUTINY_APPROVED --> EVC_SCHEDULED : Inspection Date & Team Assigned
        EVC_SCHEDULED --> EVC_IN_PROGRESS : On-Site Physical/Virtual Audit
        EVC_IN_PROGRESS --> EVC_RECOMMENDED : Norms Met (Faculty, Lab, Land)
        EVC_IN_PROGRESS --> EVC_DEFICIENT : Infrastructure Shortfall
    }

    state "Standing Hearing Committee (SHC) Stage" as SHC {
        EVC_DEFICIENT --> SHC_SCHEDULED : Escalated to Appellate Hearing
        SHC_SCHEDULED --> SHC_IN_PROGRESS : Council Hearing Conducted
        SHC_IN_PROGRESS --> SHC_CLEARED : Appeal Accepted (Compliance Proven)
        SHC_IN_PROGRESS --> SHC_REJECTED : Appeal Dismissed
    }

    EVC_RECOMMENDED --> COUNCIL_APPROVAL_PENDING : Final Council Review
    SHC_CLEARED --> COUNCIL_APPROVAL_PENDING : Final Council Review

    COUNCIL_APPROVAL_PENDING --> APPROVED : Letter of Approval (LoA) Issued
    SCRUTINY_REJECTED --> REJECTED : Letter of Rejection Issued
    SHC_REJECTED --> REJECTED : Letter of Rejection Issued

    APPROVED --> [*]
    REJECTED --> [*]
```

---

## 2. Core Module Implementations

### Module A: State Machine Orchestrator

The State Machine Orchestrator enforces application integrity at the service boundary. It prevents unauthorized state jumps (such as jumping from `DRAFT` directly to `APPROVED`, or bypassing `SCRUTINY` directly to `EVC`).

#### Transition Security Matrix & Role-Based Authorization
State changes require a cryptographically signed event payload containing the actor's authenticated JWT claims.

| Current State | Permitted Event | Next State | Authorized Role | Guard Conditions Enforced |
| :--- | :--- | :--- | :--- | :--- |
| `DRAFT` | `SUBMIT_APPLICATION` | `SCRUTINY_PENDING` | `ROLE_INSTITUTE_ADMIN` | All required dynamic JSONB fields present; DigiLocker verified. |
| `SCRUTINY_PENDING` | `ASSIGN_SCRUTINEER` | `SCRUTINY_IN_PROGRESS`| `ROLE_REGIONAL_OFFICER` | Officer not affiliated with institute state. |
| `SCRUTINY_IN_PROGRESS`| `FLAG_DEFICIENCY`| `SCRUTINY_DEFICIENT` | `ROLE_SCRUTINY_OFFICER` | Deficiency checklist has $\ge 1$ item specified. |
| `SCRUTINY_IN_PROGRESS`| `APPROVE_SCRUTINY`| `SCRUTINY_APPROVED` | `ROLE_SCRUTINY_OFFICER` | 100% compliance checks marked valid; lease validity $\ge 25$ years. |
| `SCRUTINY_APPROVED` | `SCHEDULE_EVC` | `EVC_SCHEDULED` | `ROLE_REGIONAL_OFFICER` | 3 independent EVC experts assigned with geo-tags. |
| `EVC_IN_PROGRESS` | `RECOMMEND_APPROVAL` | `EVC_RECOMMENDED` | `ROLE_EVC_CHAIRMAN` | Biometric attendance & video verification attached. |
| `EVC_IN_PROGRESS` | `FLAG_EVC_DEFICIENT` | `EVC_DEFICIENT` | `ROLE_EVC_CHAIRMAN` | Infrastructure deficit quantified with photo evidence. |
| `EVC_DEFICIENT` | `CONVENE_SHC` | `SHC_SCHEDULED` | `ROLE_AICTE_DIRECTOR` | Standing Committee panel assigned; hearing notice issued. |
| `SHC_IN_PROGRESS` | `ACCEPT_APPEAL` | `SHC_CLEARED` | `ROLE_SHC_CHAIRMAN` | Re-inspection or compliance affidavits validated. |
| `COUNCIL_APPROVAL_PENDING`|`GRANT_APPROVAL`| `APPROVED` | `ROLE_MEMBER_SECRETARY` | Digital signature token attached; formal LoA generated. |

#### Implementation Mechanics:
- **Atomic Guard Interceptors:** If an actor attempts an unauthorized transition, the NestJS Execution Context throws an `IllegalStateTransitionException (HTTP 409 Conflict)` or `InsufficientRoleException (HTTP 403 Forbidden)`.
- **Database Row-Level Concurrency:** State evaluations execute inside an isolated transaction with `SELECT ... FOR UPDATE` locks to eliminate race conditions during concurrent officer evaluations.

---

### Module B: Cryptographic Audit Trail (Merkle Trees)

Internal database tampering poses a severe corruption threat (e.g., a rogue database administrator manually altering an application state from `REJECTED` to `APPROVED` directly in SQL). ApprovalSync protects against this by implementing a **cryptographic, append-only Merkle-linked audit ledger** compliant with RFC 6962 principles.

```
+----------------------------------------------------------------------------------------------------+
|                                    Merkle Hash Chain Sequence                                      |
+----------------------------------------------------------------------------------------------------+
|  Genesis Block (Log #0)           Block (Log #N-1)                    Block (Log #N)                |
|  +-------------------------+     +-------------------------+         +-------------------------+    |
|  | id: 0                   |     | id: 1042                |         | id: 1043                |    |
|  | prev_hash: "000...000"  |     | prev_hash: "a4f9b2..."  |         | prev_hash: "7e81c0..."  |<---+ (Points to Prev)
|  | payload_hash: "e3b0..." |     | payload_hash: "5d2e..." |         | payload_hash: "9b1a..." |    |
|  | current_hash: "a4f9..." +---->| current_hash: "7e81..." +-------->| current_hash: "2c3d..." |    |
|  +-------------------------+     +-------------------------+         +-------------------------+    |
+----------------------------------------------------------------------------------------------------+
```

#### Cryptographic Specification:
1. **Canonical JSON Serialization:** For every state update, the action, user identifier, role, timestamp, application delta, and metadata are serialized deterministically (RFC 8785 JSON Canonicalization Scheme) to prevent hashing discrepancies due to whitespace or key ordering:
   $$\text{CanonicalBytes} = \text{JCS}(\text{AuditPayload})$$
2. **Leaf Hash Formulation:**
   $$\text{LeafHash} = \text{SHA-256}(0x00 \mathbin{\Vert} \text{CanonicalBytes})$$
3. **Chained Current Hash Formulation:**
   $$\text{CurrentHash} = \text{SHA-256}(0x01 \mathbin{\Vert} \text{PreviousHash} \mathbin{\Vert} \text{LeafHash} \mathbin{\Vert} \text{Timestamp})$$
4. **Tamper Detection Algorithm:**
   A continuous worker calculates the hash chain over all records. If a rogue administrator executes:
   ```sql
   UPDATE applications SET current_state = 'APPROVED' WHERE id = 'APP-2026-X99';
   ```
   The recalculated hash sequence breaks:
   $$\text{CurrentHash}_{N} \neq \text{SHA-256}(0x01 \mathbin{\Vert} \text{PreviousHash}_{N-1} \mathbin{\Vert} \text{LeafHash}_{N} \mathbin{\Vert} \text{Timestamp})$$
   The tamper scanner raises an immediate critical alert, flags the specific tampered record, and locks the application lifecycle.

---

### Module C: SLA Timer & Hierarchical Escalation Engine

Delays in processing AICTE approvals lead to severe academic disruption and institutional litigation. ApprovalSync embeds a durable SLA engine powered by **BullMQ** and **Redis** to enforce strict statutory turnaround times.

```
Application Enters State (e.g. Scrutiny)
       |
       v
  [SLA Timer Initialized (e.g., Max Duration = 7 Days / 168 Hours)]
       |
       +---> At 80% Duration (134.4 hrs) -> TIER 1 ESCALATION:
       |     * Automated SMS & Email to Scrutiny Officer
       |     * Warning banner on Scrutiny Desk UI
       |
       +---> At 100% Duration (168.0 hrs) -> TIER 2 ESCALATION:
       |     * Breach recorded in Audit Ledger
       |     * Reassignment flag raised
       |     * Priority notification to Regional Officer (RO)
       |
       +---> At 120% Duration (201.6 hrs) -> TIER 3 ESCALATION:
             * Auto-reassignment to Standing Fast-Track Committee
             * Executive Escalation Dossier dispatched to AICTE Member Secretary
             * Real-time SSE alert to Central Vigilance Monitoring Dashboard
```

#### Durable Scheduler Mechanics:
- When an application transitions to a state with an SLA limit, the `SlaService` calculates exact timestamps for `tier1_deadline`, `tier2_deadline`, and `tier3_deadline`.
- Three delayed jobs are registered in BullMQ:
  ```typescript
  await this.slaQueue.add('EVALUATE_SLA', { applicationId, tier: 'TIER_1' }, { delay: tier1DelayMs });
  await this.slaQueue.add('EVALUATE_SLA', { applicationId, tier: 'TIER_2' }, { delay: tier2DelayMs });
  await this.slaQueue.add('EVALUATE_SLA', { applicationId, tier: 'TIER_3' }, { delay: tier3DelayMs });
  ```
- **Idempotent Completion Check:** When a worker picks up the job, it verifies if the application has already exited the state. If exited, the job is discarded cleanly without false-positive escalations.

---

### Module D: Undertaking & Lease Validity Tracker

According to Chapter 1, Section 1.4 of the AICTE Approval Process Handbook (APH), technical institutions operating on leased property must possess a **registered land lease of at least 30 years**, with **at least 25 years of remaining live validity** as on the date of application submission.

#### Automated Audit Workflow:
1. **Daily Cron Daemon (00:00:00 IST):** 
   A scheduled background cron queries the `compliance_undertakings` table for all institutions.
2. **Lease Arithmetic Query:**
   $$\text{RemainingTenureYears} = \frac{\text{LeaseExpiryDate} - \text{CurrentDate}}{365.25}$$
   If $\text{RemainingTenureYears} < 25.0$, the institution breaches statutory norms.
3. **Automated Deficiency Report Generation:**
   - The engine compiles an immutable **Deficiency Dossier PDF** using headless Chromium / PDFKit.
   - Attaches precise clauses: *AICTE APH Chapter I Clause 1.4.3: Land Tenure Inadequacy*.
   - Flags the application state to `SCRUTINY_DEFICIENT`.
   - Dispatches a registered notice to the institution's primary email address and authorized signatory mobile.

---

### Module E: DigiLocker OAuth 2.0 & XMLDSig Integration

Manual verification of land titles, society registration certificates, and municipal master plans is the primary bottleneck in technical education approvals. ApprovalSync integrates directly with the **DigiLocker Requester API** via OAuth 2.0.

```
+-------------+                 +--------------+               +---------------+               +-----------------+
| Institution |                 | ApprovalSync |               |   DigiLocker  |               | Issuer (e.g.    |
|   Client    |                 |   Backend    |               |  OAuth Server |               | Rev Dept / MCA) |
+------+------+                 +-------+------+               +-------+-------+               +--------+--------+
       |                                |                              |                                |
       | 1. Initiate DigiLocker Link    |                              |                                |
       +------------------------------->|                              |                                |
       |                                | 2. Generate OAuth2 Auth URL  |                                |
       |<-------------------------------+ (scope: 'org.aicte.doc.land')|                                |
       |                                                               |                                |
       | 3. Redirect User to Consent Portal                           |                                |
       +-------------------------------------------------------------->|                                |
       |                                                               |                                |
       | 4. User Authenticates with Aadhaar OTP & Grants Consent       |                                |
       |-------------------------------------------------------------->|                                |
       |                                                               |                                |
       | 5. Redirect with Authorization Code                           |                                |
       +-------------------------------------------------------------->|                                |
       |                                |                              |                                |
       | 6. Forward Auth Code           |                              |                                |
       +------------------------------->|                              |                                |
       |                                | 7. Exchange Code for JWT     |                                |
       |                                +----------------------------->|                                |
       |                                |                              |                                |
       |                                | 8. Return Access Token & URI |                                |
       |                                |<-----------------------------+                                |
       |                                |                                                               |
       |                                | 9. Fetch Digitally Signed XML Doc                             |
       |                                +-------------------------------------------------------------->|
       |                                |                                                               |
       |                                | 10. Pull XML Payload with XMLDSig Envelope                    |
       |                                |<--------------------------------------------------------------+
       |                                |                                                               
       |                                | 11. Cryptographic XMLDSig Verification:                       
       |                                |     - Verify X.509 Certificate Chain against CCA Root Trust   
       |                                |     - Calculate SHA-256 Digest of canonicalized XML nodes     
       |                                |     - Decrypt RSA Signature using Government Public Key       
       |                                |                                                               
       | 12. Auto-Populate & Mark Form  |                                                               
       |<-------------------------------+ (Land Title, Survey No, 30-Yr Lease Verified)                 
```

#### Cryptographic XMLDSig Validation:
The incoming document response is structured as an XMLDSig enveloped signed artifact. ApprovalSync canonicalizes the XML (`http://www.w3.org/2001/10/xml-exc-c14n#`) and validates the `<ds:SignatureValue>` against the Indian Controller of Certifying Authorities (CCA) National Root Trust Anchor.

---

## 3. Database Schema Blueprint

### Entity-Relationship Diagram

```
+-----------------------------------+               +-----------------------------------+
|           APPLICATIONS            |               |          WORKFLOW_STATES          |
+-----------------------------------+               +-----------------------------------+
| PK  id: UUID                      |       +------>| PK  state_code: VARCHAR(50)       |
|     application_number: VARCHAR   |       |       |     state_name: VARCHAR(100)      |
|     academic_year: VARCHAR(9)     |       |       |     stage_group: VARCHAR(50)      |
|     institution_id: UUID          |       |       |     sla_duration_hours: INT       |
| FK  current_state: VARCHAR(50)    +-------+       |     is_terminal: BOOLEAN          |
|     payload_data: JSONB           |               +-----------------------------------+
|     created_at: TIMESTAMPTZ       |
|     updated_at: TIMESTAMPTZ       |
+-----------------+-----------------+
                  |
                  | 1:N
                  |
+-----------------v-----------------+               +-----------------------------------+
|           AUDIT_LOGS              |               |            SLA_TIMERS             |
+-----------------------------------+               +-----------------------------------+
| PK  id: BIGSERIAL                 |       +------>| PK  id: UUID                      |
| FK  application_id: UUID          +-------+       | FK  application_id: UUID          |
|     sequence_number: BIGINT       |               |     stage_code: VARCHAR(50)       |
|     actor_id: UUID                |               |     started_at: TIMESTAMPTZ       |
|     actor_role: VARCHAR(50)       |               |     tier1_deadline: TIMESTAMPTZ   |
|     event_type: VARCHAR(100)      |               |     tier2_deadline: TIMESTAMPTZ   |
|     payload_canonical: JSONB      |               |     tier3_deadline: TIMESTAMPTZ   |
|     leaf_hash: CHAR(64)           |               |     escalation_tier: INT          |
|     previous_hash: CHAR(64)       |               |     breached: BOOLEAN             |
|     current_hash: CHAR(64)        |               |     resolved_at: TIMESTAMPTZ      |
|     created_at: TIMESTAMPTZ       |               +-----------------------------------+
+-----------------------------------+
                  |
                  | 1:N
                  |
+-----------------v-----------------+
|     COMPLIANCE_UNDERTAKINGS       |
+-----------------------------------+
| PK  id: UUID                      |
| FK  application_id: UUID          |
|     document_type: VARCHAR(50)    |
|     lease_start_date: DATE        |
|     lease_expiry_date: DATE       |
|     tenure_years: NUMERIC(5,2)    |
|     live_validity_years: NUM(5,2) |
|     is_compliant: BOOLEAN         |
|     digilocker_uri: VARCHAR(255)  |
|     xmldsig_verified: BOOLEAN     |
|     deficiency_reason: TEXT       |
+-----------------------------------+
```

### Production DDL Schemas & Indexing Strategies

```sql
-- Enable necessary cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Table: workflow_states
-- ============================================================================
CREATE TABLE workflow_states (
    state_code VARCHAR(50) PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    stage_group VARCHAR(50) NOT NULL, -- 'SCRUTINY', 'EVC', 'SHC', 'COUNCIL'
    sla_duration_hours INT NOT NULL DEFAULT 168, -- 7 days default
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO workflow_states (state_code, state_name, stage_group, sla_duration_hours, is_terminal) VALUES
('DRAFT', 'Application Draft', 'APPLICANT', 0, FALSE),
('SCRUTINY_PENDING', 'Pending Scrutiny Assignment', 'SCRUTINY', 72, FALSE),
('SCRUTINY_IN_PROGRESS', 'Scrutiny Committee Evaluation', 'SCRUTINY', 168, FALSE),
('SCRUTINY_DEFICIENT', 'Deficiency Communicated to Institute', 'SCRUTINY', 120, FALSE),
('SCRUTINY_APPROVED', 'Scrutiny Cleared Successfully', 'SCRUTINY', 0, FALSE),
('SCRUTINY_REJECTED', 'Scrutiny Stage Rejection', 'SCRUTINY', 0, TRUE),
('EVC_SCHEDULED', 'Expert Visit Committee Scheduled', 'EVC', 120, FALSE),
('EVC_IN_PROGRESS', 'Physical / Virtual Inspection Underway', 'EVC', 72, FALSE),
('EVC_RECOMMENDED', 'EVC Recommended for Council Approval', 'EVC', 0, FALSE),
('EVC_DEFICIENT', 'EVC Reported Serious Infrastructure Deficits', 'EVC', 48, FALSE),
('SHC_SCHEDULED', 'Standing Hearing Committee Convened', 'SHC', 168, FALSE),
('SHC_IN_PROGRESS', 'Appellate Hearing in Session', 'SHC', 48, FALSE),
('SHC_CLEARED', 'SHC Cleared Deficiencies on Appeal', 'SHC', 0, FALSE),
('SHC_REJECTED', 'SHC Confirmed Rejection', 'SHC', 0, TRUE),
('COUNCIL_APPROVAL_PENDING', 'Final AICTE Council Ratification', 'COUNCIL', 96, FALSE),
('APPROVED', 'Letter of Approval (LoA) Issued', 'COUNCIL', 0, TRUE),
('REJECTED', 'Application Formally Rejected', 'COUNCIL', 0, TRUE);

-- ============================================================================
-- 2. Table: applications (With JSONB APH Dynamic Schema)
-- ============================================================================
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(64) NOT NULL UNIQUE,
    academic_year VARCHAR(9) NOT NULL, -- e.g., '2026-2027'
    institution_id UUID NOT NULL,
    current_state VARCHAR(50) NOT NULL REFERENCES workflow_states(state_code),
    payload_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Advanced Indexing for Fast Querying & JSON Filtering
CREATE INDEX idx_applications_institution_id ON applications(institution_id);
CREATE INDEX idx_applications_current_state ON applications(current_state);
CREATE INDEX idx_applications_payload_gin ON applications USING gin (payload_data);
CREATE INDEX idx_applications_land_area ON applications USING btree (((payload_data->'land_details'->>'total_acres')::numeric));

-- ============================================================================
-- 3. Table: audit_logs (RFC 6962 SHA-256 Chained Immutable Ledger)
-- ============================================================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    sequence_number BIGINT NOT NULL,
    actor_id UUID NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload_canonical JSONB NOT NULL,
    leaf_hash CHAR(64) NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    current_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_app_sequence UNIQUE(application_id, sequence_number)
);

CREATE INDEX idx_audit_logs_app_id ON audit_logs(application_id);
CREATE INDEX idx_audit_logs_cur_hash ON audit_logs(current_hash);

-- Enforce Append-Only Property via Trigger Protection
CREATE OR REPLACE FUNCTION prevent_audit_log_tamper()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Audit logs are strictly append-only (WORM). Modifying or deleting records is prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tamper();

-- ============================================================================
-- 4. Table: sla_timers (Durable Execution Scheduler State)
-- ============================================================================
CREATE TABLE sla_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL REFERENCES workflow_states(state_code),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_hours INT NOT NULL,
    tier1_deadline TIMESTAMPTZ NOT NULL, -- 80% mark
    tier2_deadline TIMESTAMPTZ NOT NULL, -- 100% mark
    tier3_deadline TIMESTAMPTZ NOT NULL, -- 120% mark
    escalation_tier INT NOT NULL DEFAULT 0, -- 0: Normal, 1: RO, 2: Director, 3: Chairman
    breached BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sla_timers_active_breaches ON sla_timers(escalation_tier, breached) WHERE resolved_at IS NULL;
CREATE INDEX idx_sla_timers_app_stage ON sla_timers(application_id, stage_code);

-- ============================================================================
-- 5. Table: compliance_undertakings (Lease & Deed Validity Auditing)
-- ============================================================================
CREATE TABLE compliance_undertakings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'REGISTERED_LEASE_DEED', 'LAND_CONVERSION_CERT'
    document_number VARCHAR(100) NOT NULL,
    registration_office VARCHAR(150) NOT NULL,
    lease_start_date DATE NOT NULL,
    lease_expiry_date DATE NOT NULL,
    tenure_years NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND(((lease_expiry_date - lease_start_date) / 365.25), 2)
    ) STORED,
    live_validity_years NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND(((lease_expiry_date - CURRENT_DATE) / 365.25), 2)
    ) STORED,
    is_compliant BOOLEAN NOT NULL DEFAULT FALSE,
    digilocker_uri VARCHAR(255),
    xmldsig_verified BOOLEAN NOT NULL DEFAULT FALSE,
    deficiency_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_undertakings_app ON compliance_undertakings(application_id);
CREATE INDEX idx_compliance_undertakings_noncompliant ON compliance_undertakings(is_compliant) WHERE is_compliant = FALSE;
```

---

## 4. Repository Directory Layout

```
ApprovalSync/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                   # Automated testing, linting & container build
│       └── security-audit.yml          # Trivy container scan & cryptographic tests
├── docker/
│   ├── backend.Dockerfile              # Multi-stage production NestJS image
│   ├── frontend.Dockerfile             # Multi-stage production React/Nginx image
│   ├── mock-digilocker.Dockerfile      # Local DigiLocker API OAuth2/XMLDSig stub
│   └── postgres/
│       ├── 01-init.sql                 # Database initialization DDL schemas
│       └── 02-seed.sql                 # AICTE regions, officers & roles seed data
├── docker-compose.yml                  # Full-stack local orchestration
├── docker-compose.override.yml         # Development hot-reload volume binds
├── docs/
│   ├── IMPLEMENTATION_PLAN.md          # Comprehensive implementation roadmap
│   ├── aicte-aph-clauses.md            # Mapped APH 2026-27 statutory clauses
│   ├── architecture-spec.png           # Exported C4 architecture diagram
│   └── swagger.json                    # Exported OpenAPI 3.0 specification
├── backend/                            # Core Backend Microservice
│   ├── src/
│   │   ├── main.ts                     # Application bootstrap & security filters
│   │   ├── app.module.ts               # Root dependency injection container
│   │   ├── common/
│   │   │   ├── decorators/             # @Roles, @CurrentUser, @AuditContext
│   │   │   ├── guards/                 # JwtAuthGuard, RolesGuard, StateMachineGuard
│   │   │   └── interceptors/           # MerkleAuditInterceptor, LoggingInterceptor
│   │   ├── config/                     # Type-safe configuration loader
│   │   ├── modules/
│   │   │   ├── applications/           # Dynamic APH JSONB application handlers
│   │   │   ├── state-machine/          # FSM engine, transition matrix & guards
│   │   │   ├── audit-ledger/           # Merkle tree, SHA-256 chains, RFC 6962 engine
│   │   │   ├── sla-orchestrator/       # BullMQ durable scheduler & SSE dispatcher
│   │   │   ├── compliance-lease/       # Cron daemon & PDF deficiency engine
│   │   │   └── digilocker/             # OAuth 2.0 requester client & XMLDSig verifier
│   │   └── database/                   # TypeORM / Prisma entity providers
│   ├── test/
│   │   ├── e2e/                        # End-to-end integration test suites
│   │   └── unit/                       # FSM and Merkle mathematical unit tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/                           # React 18 Administrative & Institute Web SPA
│   ├── src/
│   │   ├── App.tsx                     # Main layout & router entry point
│   │   ├── components/
│   │   │   ├── ApplicationForm/        # Dynamic JSON schema form renderer
│   │   │   ├── StateTracker/           # Interactive visual FSM stage tracker
│   │   │   ├── AuditLedger/            # Cryptographic block visualizer & verification UI
│   │   │   └── SlaAlerts/              # Real-time WebSocket/SSE notification badge
│   │   ├── hooks/                      # Custom hooks for SSE and state machine actions
│   │   └── services/                   # Axios API clients for backend endpoints
│   ├── package.json
│   └── vite.config.ts
└── scripts/
    ├── tamper_database_entry.sql       # Script to simulate malicious SQL update
    ├── verify_merkle_chain.ts          # CLI verifier that detects hash tampering
    └── fast_forward_sla.ts             # Evaluation script to trigger instant SLA breach
```

---

## 5. Deployment Strategy & Docker Setup

### Docker Compose Topology

The platform provides a one-click deployment environment orchestrating PostgreSQL 16, Redis 7, the NestJS Backend Core, the React Frontend Client, and a DigiLocker Mock Server.

```yaml
version: '3.8'

services:
  # ============================================================================
  # 1. Primary PostgreSQL 16 Enterprise Database
  # ============================================================================
  postgres:
    image: postgres:16-alpine
    container_name: approvalsync-postgres
    restart: always
    environment:
      POSTGRES_DB: aicte_workflow_db
      POSTGRES_USER: aicte_admin
      POSTGRES_PASSWORD: SecretProductionPassword123!
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/01-init.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aicte_admin -d aicte_workflow_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ============================================================================
  # 2. Redis 7 High-Performance Broker (BullMQ & Cache)
  # ============================================================================
  redis:
    image: redis:7-alpine
    container_name: approvalsync-redis
    restart: always
    command: redis-server --appendonly yes --requirepass RedisQueuePassword123!
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "RedisQueuePassword123!", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ============================================================================
  # 3. DigiLocker OAuth2 / XMLDSig Mock Gateway (For Hackathon Evaluation)
  # ============================================================================
  mock-digilocker:
    build:
      context: .
      dockerfile: docker/mock-digilocker.Dockerfile
    container_name: approvalsync-mock-digilocker
    restart: always
    ports:
      - "8089:8089"
    environment:
      PORT: 8089

  # ============================================================================
  # 4. Backend Microservice (NestJS Core API + State Machine + Audit Ledger)
  # ============================================================================
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    container_name: approvalsync-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      mock-digilocker:
        condition: service_started
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      NODE_ENV: production
      DATABASE_URL: postgresql://aicte_admin:SecretProductionPassword123!@postgres:5432/aicte_workflow_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: RedisQueuePassword123!
      JWT_SECRET: ProductionJwtSecretKeyForApprovalSyncPlatform2026!
      DIGILOCKER_CLIENT_ID: AICTE_REQUESTER_CLIENT_ID
      DIGILOCKER_CLIENT_SECRET: AICTE_REQUESTER_SECRET_KEY
      DIGILOCKER_AUTH_URL: http://mock-digilocker:8089/oauth/authorize
      DIGILOCKER_TOKEN_URL: http://mock-digilocker:8089/oauth/token
      DIGILOCKER_API_BASE: http://mock-digilocker:8089/api/v1
    healthcheck:
      test: ["CMD-SHELL", "wget --spider http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3

  # ============================================================================
  # 5. Frontend Client Application (React 18 + Vite SPA on Nginx)
  # ============================================================================
  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend.Dockerfile
    container_name: approvalsync-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
  redisdata:
```

### Environment Variables Configuration

Copy `.env.example` to `.env` in the repository root:

```bash
# Database Configuration
DATABASE_URL=postgresql://aicte_admin:SecretProductionPassword123!@localhost:5432/aicte_workflow_db

# Redis Message Broker
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=RedisQueuePassword123!

# Security & Tokens
JWT_SECRET=ProductionJwtSecretKeyForApprovalSyncPlatform2026!
JWT_EXPIRES_IN=86400s

# DigiLocker Requester Credentials
DIGILOCKER_CLIENT_ID=AICTE_REQUESTER_CLIENT_ID
DIGILOCKER_CLIENT_SECRET=AICTE_REQUESTER_SECRET_KEY
DIGILOCKER_AUTH_URL=http://localhost:8089/oauth/authorize
DIGILOCKER_TOKEN_URL=http://localhost:8089/oauth/token
DIGILOCKER_API_BASE=http://localhost:8089/api/v1

# SLA & Escalation Settings
SLA_CHECK_CRON="*/5 * * * *"
LEASE_AUDIT_CRON="0 0 * * *"
```

---

## 6. Hackathon Evaluation Demo Script

This comprehensive demonstration script validates all three core technical requirements for the Smart India Hackathon evaluators.

### Proof 1: FSM Blocking Illegal State Transitions

**Evaluator Objective:** Prove that an applicant or compromised account cannot bypass the Scrutiny stage or jump straight from `DRAFT` to `APPROVED`.

```bash
# Step 1: Create a fresh application in DRAFT state
APP_ID=$(curl -s -X POST http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer $INSTITUTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": "2026-2027",
    "institutionName": "National Institute of Advanced Technology",
    "payloadData": {
      "facultyCount": 42,
      "landDetails": { "totalAcres": 10.5, "leaseYears": 30 }
    }
  }' | jq -r '.id')

echo "Application created with ID: $APP_ID (Current Status: DRAFT)"

# Step 2: Attempt illegal transition: Directly jump from DRAFT to APPROVED
curl -s -i -X POST http://localhost:3000/api/v1/applications/$APP_ID/transition \
  -H "Authorization: Bearer $INSTITUTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "targetState": "APPROVED", "remarks": "Unauthorized approval attempt" }'
```

**Expected HTTP Response (Validation Success):**
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "statusCode": 409,
  "error": "IllegalStateTransitionException",
  "message": "Invalid state transition requested: Cannot transition directly from 'DRAFT' to 'APPROVED'. Required intermediate state is 'SCRUTINY_PENDING'.",
  "currentState": "DRAFT",
  "attemptedState": "APPROVED",
  "timestamp": "2026-10-21T00:15:30.124Z"
}
```

---

### Proof 2: Merkle Hash-Chain Tamper Detection

**Evaluator Objective:** Demonstrate that if an insider executes an SQL `UPDATE` directly in PostgreSQL to tamper with an application status, the cryptographic audit trail immediately flags the discrepancy and pinpoints the corrupted record.

```bash
# Step 1: Transition application legally from DRAFT to SCRUTINY_PENDING
curl -s -X POST http://localhost:3000/api/v1/applications/$APP_ID/transition \
  -H "Authorization: Bearer $INSTITUTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "targetState": "SCRUTINY_PENDING", "remarks": "Final submission by Institute" }'

# Step 2: Verify that the Merkle Hash-Chain is currently 100% VALID
npm --prefix backend run verify:ledger -- --appId=$APP_ID
```
*Output before tampering:*
```
[INFO] Verifying cryptographic integrity for Application: APP-2026-X99
[BLOCK 1] Sequence: 1 | Hash: 4e0f1b... | Status: VALID
[BLOCK 2] Sequence: 2 | Hash: d89c2a... | Status: VALID
[SUCCESS] All 2 Merkle blocks mathematically verified against RFC 6962 specification. Chain integrity intact.
```

```bash
# Step 3: Rogue Database Administrator simulates malicious backdoor update
docker exec -i approvalsync-postgres psql -U aicte_admin -d aicte_workflow_db -c \
  "UPDATE applications SET current_state = 'APPROVED' WHERE id = '$APP_ID';"

# Step 4: Run the Cryptographic Verifier again
npm --prefix backend run verify:ledger -- --appId=$APP_ID
```

**Evaluator Output (Tamper Detected Instantly):**
```
[CRITICAL ALERT] Cryptographic verification FAILED at Sequence #2!
Expected Hash: d89c2a5bf890123e4f71a0e88234bd5239a7b93f12456ecba76d123e71239aa8
Calculated Hash: 12af4e891c390da25ecf23149021834901ba3201948123019482309182301923
Root Cause: Application state in record does not match canonical audit block payload!
Current Database State: 'APPROVED'
Ledger Signed State:    'SCRUTINY_PENDING'
[SECURITY LOCK] Application $APP_ID has been locked against further processing. Tamper Incident Report generated: /var/log/audit/tamper-20261021-001.log
```

---

### Proof 3: Live SLA Breach & Multi-Tier Escalation Alert

**Evaluator Objective:** Prove that background workers monitor turnaround times and trigger real-time multi-tier hierarchical escalations.

```bash
# Step 1: Subscribe to the Real-Time Central Vigilance SSE Stream
curl -N -H "Accept: text/event-stream" http://localhost:3000/api/v1/vigilance/stream &
VIGILANCE_PID=$!

# Step 2: Fast-forward the SLA clock on the active application past 100% (Tier 2 Breach)
npm --prefix backend run sla:fast-forward -- --appId=$APP_ID --hours=175
```

**Evaluator SSE Stream Output (Real-Time Escalation Received):**
```json
data: {
  "eventType": "SLA_TIER2_BREACH",
  "applicationId": "c8a4128f-7982-4fa1-8ec2-1329c0a1b24e",
  "applicationNumber": "AICTE-2026-DEL-10492",
  "stage": "SCRUTINY_IN_PROGRESS",
  "officerAssigned": "Dr. R. K. Sharma (Scrutiny Officer, Northern Region)",
  "durationAllowedHours": 168,
  "elapsedHours": 175,
  "escalationTier": 2,
  "escalatedTo": "Regional Officer (Northern Regional Office, Kanpur)",
  "actionMandated": "Immediate Dossier Review within 24 Hours or Direct Standing Committee Escalation",
  "timestamp": "2026-10-21T00:18:45.312Z"
}
```

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details. Developed for the **Smart India Hackathon** to empower the **All India Council for Technical Education (AICTE)**.
