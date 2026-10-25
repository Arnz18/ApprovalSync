/**
 * ApprovalSync — Dossier Verification API Service
 * Milestone: FE-04
 * Connects to DOC-07 dossier report controller endpoints under /api/v1/applications/:id/dossier-report.
 */

import { apiClient } from '../client';
import {
  DossierReport,
  DossierSummary,
  DossierQueryOptions,
} from '../../scrutiny/types';

export const dossierService = {
  /**
   * Retrieve cached consolidated dossier verification report for an application.
   * If recalculate=true, forces complete multi-pipeline re-evaluation on server.
   * Path: GET /api/v1/applications/:id/dossier-report
   */
  async getDossierReport(
    applicationId: string,
    options?: DossierQueryOptions,
  ): Promise<DossierReport> {
    const params: Record<string, string | boolean | undefined> = {};
    if (options?.recalculate !== undefined) {
      params.recalculate = options.recalculate;
    }
    if (options?.asOfDate) {
      params.asOfDate = options.asOfDate;
    }
    return apiClient.get<DossierReport>(
      `/applications/${encodeURIComponent(applicationId)}/dossier-report`,
      params,
    );
  },

  /**
   * Explicit action trigger to evaluate/re-evaluate multi-pipeline dossier verification.
   * Path: POST /api/v1/applications/:id/dossier-report
   */
  async evaluateDossier(
    applicationId: string,
    options?: DossierQueryOptions,
  ): Promise<DossierReport> {
    const params: Record<string, string | boolean | undefined> = {};
    if (options?.recalculate !== undefined) {
      params.recalculate = options.recalculate;
    }
    if (options?.asOfDate) {
      params.asOfDate = options.asOfDate;
    }
    return apiClient.post<DossierReport>(
      `/applications/${encodeURIComponent(applicationId)}/dossier-report`,
      {},
      { params },
    );
  },

  /**
   * Retrieve lightweight dossier summary for scrutiny queue rows.
   * Path: GET /api/v1/applications/:id/dossier-report/summary
   */
  async getDossierSummary(
    applicationId: string,
    options?: DossierQueryOptions,
  ): Promise<DossierSummary> {
    const params: Record<string, string | boolean | undefined> = {};
    if (options?.recalculate !== undefined) {
      params.recalculate = options.recalculate;
    }
    if (options?.asOfDate) {
      params.asOfDate = options.asOfDate;
    }
    return apiClient.get<DossierSummary>(
      `/applications/${encodeURIComponent(applicationId)}/dossier-report/summary`,
      params,
    );
  },
};
