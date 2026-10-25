/**
 * ApprovalSync — Provider Capability Enum
 * Milestone: DOC-05
 *
 * Declares operational capabilities supported by external verification adapters.
 */

export enum ProviderCapability {
  SIGNATURE_VERIFICATION = 'SIGNATURE_VERIFICATION',
  LAND_RECORD_SEARCH = 'LAND_RECORD_SEARCH',
  REGISTRATION_LOOKUP = 'REGISTRATION_LOOKUP',
  ACCREDITATION_VERIFY = 'ACCREDITATION_VERIFY',
  IDENTITY_CONFIRMATION = 'IDENTITY_CONFIRMATION',
}
