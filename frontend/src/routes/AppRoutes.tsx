import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { FeaturePlaceholderPage } from '../pages/FeaturePlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Primary initial route */}
        <Route index element={<HomePage />} />

        {/* Downstream Chunk Routes */}
        <Route
          path="applications"
          element={
            <FeaturePlaceholderPage
              moduleCode="APPLICATIONS"
              title="Application Intake & Wizard"
              description="Drafting, dynamic category checklists, document attachments, and atomic submission."
              assignedChunk="FE-03"
              dependencies={['FE-02', 'BE-04', 'DOC-01']}
              dependencyStatus="BLOCKED"
              expectedFeatures={[
                'Multi-step category application intake wizard (Engineering, Pharmacy, Architecture, etc.)',
                'Streaming file upload with MIME & magic byte validation (%PDF-, PNG, JPEG)',
                'Tenant-scoped draft persistence with auto-save',
                'Atomic submission with pessimistic row-locking preventing double-submissions',
              ]}
            />
          }
        />

        <Route
          path="scrutiny"
          element={
            <FeaturePlaceholderPage
              moduleCode="SCRUTINY"
              title="Scrutiny Officer Review Queue"
              description="Documentary scrutiny, AI anomaly review, human officer disposition, and deficiency workflow."
              assignedChunk="FE-04"
              dependencies={['FE-02', 'BE-06', 'DOC-07']}
              dependencyStatus="BLOCKED"
              expectedFeatures={[
                'Scrutiny queue with status and ageing indicators',
                'Document dossier side-by-side view with extracted OCR evidence and bounding boxes',
                'Officer disposition controls: Approve, Flag Deficiency, or Override AI finding with justification',
                'Atomic workflow state transitions triggering chronological audit timeline events',
              ]}
            />
          }
        />

        <Route
          path="verification"
          element={
            <FeaturePlaceholderPage
              moduleCode="VERIFICATION"
              title="Document AI & Duplicate Detection Engine"
              description="Multi-tier duplicate checks, perceptual similarity, template discrimination, and PDF integrity."
              assignedChunk="DOC-04"
              dependencies={['DOC-01', 'DOC-02', 'DOC-03']}
              dependencyStatus="COMMITTED"
              expectedFeatures={[
                'Exact SHA-256 duplicate detection (intra-app, same-institution, and cross-institution)',
                '64-bit perceptual hash (pHash) Hamming distance similarity matching',
                'Template discrimination protecting standard government forms from false duplicate flags',
                'PDF structural anomaly scans: active executable launch content, ModDate inversion, and image editing markers',
              ]}
            />
          }
        />

        <Route
          path="evc"
          element={
            <FeaturePlaceholderPage
              moduleCode="EVC"
              title="EVC Scheduling & Ground Inspection"
              description="Expert roster availability, conflict declarations, ground photo verification, and committee reports."
              assignedChunk="FE-06"
              dependencies={['BE-06', 'DOC-06']}
              dependencyStatus="BLOCKED"
              expectedFeatures={[
                'Randomized expert roster assignment with conflict-of-interest checks',
                'On-site photo and video evidence verification with geo-tagging and timestamps',
                'EVC inspection report authoring and Standing Hearing Committee (SHC) escalation',
              ]}
            />
          }
        />

        <Route
          path="rules"
          element={
            <FeaturePlaceholderPage
              moduleCode="RULES"
              title="APH Versioned Regulatory Rules & Checklists"
              description="Approval Process Handbook rules, monotonic versioning, and applicable-version resolution."
              assignedChunk="BE-05"
              dependencies={['BE-04']}
              dependencyStatus="COMMITTED"
              expectedFeatures={[
                'Rule set drafting, validation, and atomic transactional publication',
                'Three-tier classification: Verified Regulatory, Unverified Review Required, and Illustrative Demo',
                'Deterministic applicable version resolution for evaluation dates (YYYY-MM-DD)',
                'Immutable published policies preventing retroactive compliance alteration',
              ]}
            />
          }
        />

        <Route
          path="audit"
          element={
            <FeaturePlaceholderPage
              moduleCode="AUDIT"
              title="Cryptographic Audit Ledger & Proofs"
              description="Append-only SHA-256 event chaining, tamper-evident hash ledger, and Merkle root verification."
              assignedChunk="BE-07"
              dependencies={['BE-02']}
              dependencyStatus="PLANNED"
              expectedFeatures={[
                'Append-only cryptographic event chain with SHA-256 block hashing',
                'Database trigger mutation defense blocking UPDATE and DELETE on audit logs',
                'Independent auditor read-only verification view and Merkle proof generation',
              ]}
            />
          }
        />

        <Route
          path="settings"
          element={
            <FeaturePlaceholderPage
              moduleCode="SETTINGS"
              title="Platform Settings & Environment Status"
              description="Configuration parameters, environment endpoints, and developer controls."
              assignedChunk="FE-01"
              dependencies={['FND-02', 'FND-03']}
              dependencyStatus="COMMITTED"
              expectedFeatures={[
                'Vite environment variables and API base URL configuration',
                'System health status probe and response latency monitoring',
                'Design system theme tokens and accessibility preferences',
              ]}
            />
          }
        />

        {/* 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
