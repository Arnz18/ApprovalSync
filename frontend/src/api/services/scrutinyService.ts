/**
 * ApprovalSync — Scrutiny Workspace Domain Service
 * Milestone: FE-04
 * Coordinates applications, dossier verification, and workflow operations.
 */

import { applicationsService } from './applicationsService';
import { dossierService } from './dossierService';
import { workflowService } from './workflowService';
import { documentsService } from './documentsService';
import { PaginationQueryParams } from '../types';
import { ApplicationProjection, ApplicationListResponse } from '../../applications/types';
import { DossierSummary } from '../../scrutiny/types';

export const scrutinyService = {
  /**
   * Retrieves list of applications for the scrutiny review queue.
   */
  async getQueue(params?: PaginationQueryParams): Promise<ApplicationListResponse> {
    return applicationsService.listApplications(params);
  },

  /**
   * Retrieves full application details for case detail workspace.
   */
  async getCaseDetails(id: string): Promise<ApplicationProjection> {
    return applicationsService.getApplication(id);
  },

  /**
   * Retrieves document attachments metadata for a case.
   */
  async getCaseDocuments(id: string) {
    return applicationsService.getApplicationDocuments(id);
  },

  /**
   * Enriches queue items with lightweight dossier verification summaries.
   * Fetches summaries with a concurrency limit (default 3) to prevent backend flooding.
   * Gracefully handles partial failures so one error never crashes the entire queue.
   */
  async enrichQueueSummaries(
    items: ApplicationProjection[],
    concurrency = 3,
  ): Promise<Record<string, DossierSummary | null>> {
    const results: Record<string, DossierSummary | null> = {};
    const queue = [...items];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        // Only applications that have been submitted or further in the lifecycle have dossier evaluations
        if (item.status === 'DRAFT') {
          results[item.id] = null;
          continue;
        }

        try {
          const summary = await dossierService.getDossierSummary(item.id);
          results[item.id] = summary;
        } catch {
          // If summary is not yet evaluated, absent, or fails, record as null without erroring
          results[item.id] = null;
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    return results;
  },

  // Direct delegation
  ...dossierService,
  ...workflowService,
  downloadDocument: documentsService.downloadDocument,
};
