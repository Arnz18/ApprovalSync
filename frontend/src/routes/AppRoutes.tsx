import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ApplicationWizardPage } from '../pages/ApplicationWizardPage';
import { ScrutinyQueuePage } from '../pages/ScrutinyQueuePage';
import { CaseDetailPage } from '../pages/CaseDetailPage';
import { FeaturePlaceholderPage } from '../pages/FeaturePlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTE_PERMISSIONS } from '../auth/roleRoutes';
import { AuthContext, AuthProvider } from '../auth/AuthContext';

export function AppRoutes(): React.ReactElement {
  const existingAuth = React.useContext(AuthContext);

  const routes = (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Institutional Workspace */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Primary initial route */}
        <Route
          index
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/'].allowedRoles}>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* Real Application Intake Wizard (FE-03) */}
        <Route
          path="applications"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/applications'].allowedRoles}>
              <ApplicationWizardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="scrutiny"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/scrutiny'].allowedRoles}>
              <ScrutinyQueuePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="scrutiny/:applicationId"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/scrutiny'].allowedRoles}>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="verification"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/verification'].allowedRoles}>
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
            </ProtectedRoute>
          }
        />

        <Route
          path="evc"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/evc'].allowedRoles}>
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
            </ProtectedRoute>
          }
        />

        <Route
          path="rules"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/rules'].allowedRoles}>
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
            </ProtectedRoute>
          }
        />

        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/audit'].allowedRoles}>
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
            </ProtectedRoute>
          }
        />

        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS['/settings'].allowedRoles}>
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
            </ProtectedRoute>
          }
        />

        {/* 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );

  if (!existingAuth) {
    return <AuthProvider>{routes}</AuthProvider>;
  }

  return routes;
}
