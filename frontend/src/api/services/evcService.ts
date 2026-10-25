/**
 * ApprovalSync — EVC Queue & Inspection Workspace Service
 * Milestone: FE-06
 * Connects to applications, workflow, and compliance APIs for the EVC workflow.
 */

import { applicationsService } from './applicationsService';
import { complianceService } from './complianceService';
import { dossierService } from './dossierService';
import { EvcFilterState, EvcQueueItem, ComplianceAssessmentResult } from '../../evc/types';
import { DossierSummary } from '../../scrutiny/types';
import { ApplicationProjection } from '../../applications/types';

const CONCURRENCY_LIMIT = 3;

export const evcService = {
  /**
   * Retrieve paginated applications queue for EVC inspection and committee review.
   * Path: GET /api/v1/applications
   */
  async getEvcQueue(filterState: EvcFilterState): Promise<{
    items: EvcQueueItem[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const query: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {
      page: filterState.page,
      limit: filterState.limit,
      sortOrder: filterState.sortOrder,
    };

    if (filterState.status && filterState.status !== 'ALL') {
      query.status = filterState.status;
    }

    if (filterState.search && filterState.search.trim()) {
      query.search = filterState.search.trim();
    }

    if (filterState.sortBy) {
      query.sortBy = filterState.sortBy;
    }

    const response = await applicationsService.listApplications(query);

    const items: EvcQueueItem[] = response.items.map((app) => ({
      ...app,
      compliance: null,
      dossierSummary: null,
      loadingSummary: false,
      summaryError: null,
    }));

    return {
      items,
      pagination: response.pagination,
    };
  },

  /**
   * Bounded concurrency enrichment of compliance assessments and dossier summaries
   * for visible page rows without overwhelming backend endpoints.
   */
  async enrichEvcSummaries(applicationIds: string[]): Promise<
    Record<
      string,
      {
        compliance: ComplianceAssessmentResult | null;
        dossierSummary: DossierSummary | null;
      }
    >
  > {
    const results: Record<
      string,
      {
        compliance: ComplianceAssessmentResult | null;
        dossierSummary: DossierSummary | null;
      }
    > = {};

    if (!applicationIds || applicationIds.length === 0) {
      return results;
    }

    const queue = [...applicationIds];

    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) break;

        const [complianceResult, dossierResult] = await Promise.allSettled([
          complianceService.getApplicationCompliance(id),
          dossierService.getDossierSummary(id),
        ]);

        results[id] = {
          compliance: complianceResult.status === 'fulfilled' ? complianceResult.value : null,
          dossierSummary: dossierResult.status === 'fulfilled' ? dossierResult.value : null,
        };
      }
    };

    const workerCount = Math.min(CONCURRENCY_LIMIT, applicationIds.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    return results;
  },

  /**
   * Retrieve authoritative application details for case inspection workspace.
   * Path: GET /api/v1/applications/:id
   */
  async getCaseDetails(applicationId: string): Promise<ApplicationProjection> {
    return applicationsService.getApplication(applicationId);
  },
};
