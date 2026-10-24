/**
 * ApprovalSync — Institution Response Projection Interfaces
 * Milestone: BE-04
 */

export interface InstitutionProfileProjection {
  id: string;
  name: string;
  registrationNumber: string;
  institutionType: string;
  state: string;
  district: string;
  pincode: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}
