/**
 * ApprovalSync — Compliance Evidence & Infrastructure Assist Service
 * Milestone: DOC-06 / FE-06
 * Connects to DOC-06 compliance controller endpoints under /api/v1/applications/:id.
 */

import { apiClient } from '../client';
import { ComplianceAssessmentResult, EvaluateComplianceDto } from '../../evc/types';

export const complianceService = {
  /**
   * Retrieve cached or computed compliance assessment for an application.
   * Path: GET /api/v1/applications/:id/compliance-assist
   */
  async getApplicationCompliance(applicationId: string): Promise<ComplianceAssessmentResult> {
    return apiClient.get<ComplianceAssessmentResult>(
      `/applications/${encodeURIComponent(applicationId)}/compliance-assist`,
    );
  },

  /**
   * Trigger explicit re-evaluation of compliance against versioned rules.
   * Path: POST /api/v1/applications/:id/compliance-assist/evaluate
   */
  async evaluateCompliance(
    applicationId: string,
    dto?: EvaluateComplianceDto,
  ): Promise<ComplianceAssessmentResult> {
    return apiClient.post<ComplianceAssessmentResult>(
      `/applications/${encodeURIComponent(applicationId)}/compliance-assist/evaluate`,
      dto || {},
    );
  },
};
