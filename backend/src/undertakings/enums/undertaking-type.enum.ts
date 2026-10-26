/**
 * ApprovalSync — Undertaking & Lease Record Type
 * Milestone: BE-09
 *
 * Categorizes institutional undertakings, lease deeds, covenants, and safety clearances.
 */

export enum UndertakingType {
  LAND_LEASE = 'LAND_LEASE', // Registered land lease deed (30-year statutory norm)
  BUILDING_LEASE = 'BUILDING_LEASE', // Facility / built-up space lease deed
  AFFIDAVIT_UNDERTAKING = 'AFFIDAVIT_UNDERTAKING', // AICTE APH statutory compliance affidavit / undertaking
  FIRE_SAFETY_CLEARANCE = 'FIRE_SAFETY_CLEARANCE', // Periodic Fire Safety NOC / clearance
  STRUCTURAL_STABILITY = 'STRUCTURAL_STABILITY', // Building structural stability certificate / undertaking
  LAND_USE_CONVERSION = 'LAND_USE_CONVERSION', // Change of Land Use (CLU) compliance covenant
  EQUIPMENT_SAFETY = 'EQUIPMENT_SAFETY', // Workshop / laboratory safety undertaking
  GENERAL_COMPLIANCE = 'GENERAL_COMPLIANCE', // General institutional undertaking
}
