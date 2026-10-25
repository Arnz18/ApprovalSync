/**
 * ApprovalSync — Synthetic Issuer Records Fixtures
 * Milestone: DOC-05
 *
 * Clearly labelled synthetic test records for deterministic simulation of
 * external issuer registries (DigiLocker, State Land Records, Municipal Fire NOCs).
 *
 * NOTE: All records are strictly synthetic test doubles. They contain zero real
 * credentials, zero PII, and zero genuine government registry data.
 */

import { SimulationScenario } from '../interfaces/verification-request.interface';

export interface SyntheticIssuerRecord {
  documentNumber: string;
  documentType: string;
  issuerName: string;
  institutionName: string;
  state: string;
  district: string;
  khasraNumber?: string;
  surveyNumber?: string;
  areaAcres?: number;
  registrationDate: string;
  expiryDate?: string;
  issuanceStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'CANCELLED';
  sourceReference: string;
  scenario: SimulationScenario;
  discrepancyDescription?: string;
}

export const SYNTHETIC_ISSUER_REGISTRY: SyntheticIssuerRecord[] = [
  {
    documentNumber: 'MAH-PUN-2024-REG-09821',
    documentType: 'LAND_TITLE_DEED',
    issuerName:
      'Department of Revenue & Land Records, Government of Maharashtra',
    institutionName: 'Demo Institute of Technology',
    state: 'Maharashtra',
    district: 'Pune',
    khasraNumber: '42/1A',
    surveyNumber: 'SRV-8820',
    areaAcres: 5.0,
    registrationDate: '2024-01-15T00:00:00.000Z',
    expiryDate: '2054-01-14T00:00:00.000Z',
    issuanceStatus: 'ACTIVE',
    sourceReference: 'TXN-MH-PUN-2024-88412-SIMULATED',
    scenario: 'MATCH',
  },
  {
    documentNumber: 'MAH-PUN-2024-REG-99999',
    documentType: 'LAND_TITLE_DEED',
    issuerName:
      'Department of Revenue & Land Records, Government of Maharashtra',
    institutionName: 'Unrelated Commercial Builder Ltd',
    state: 'Maharashtra',
    district: 'Pune',
    khasraNumber: '99/9Z',
    surveyNumber: 'SRV-9999',
    areaAcres: 1.2,
    registrationDate: '2023-06-10T00:00:00.000Z',
    expiryDate: '2053-06-09T00:00:00.000Z',
    issuanceStatus: 'ACTIVE',
    sourceReference: 'TXN-MH-PUN-2024-99123-SIMULATED',
    scenario: 'MISMATCH',
    discrepancyDescription:
      'Registered land owner is "Unrelated Commercial Builder Ltd" (expected institution name) and registered area is 1.2 acres (expected 5.0 acres).',
  },
  {
    documentNumber: 'FIRE-NOC-2021-332',
    documentType: 'FIRE_SAFETY_CERTIFICATE',
    issuerName: 'Pune Municipal Fire Brigade Authority',
    institutionName: 'Demo Institute of Technology',
    state: 'Maharashtra',
    district: 'Pune',
    registrationDate: '2021-04-01T00:00:00.000Z',
    expiryDate: '2024-03-31T00:00:00.000Z',
    issuanceStatus: 'EXPIRED',
    sourceReference: 'MH-FIRE-2021-00441-SIMULATED',
    scenario: 'EXPIRED',
    discrepancyDescription:
      'Fire Safety Certificate expired on 2024-03-31 in municipal registry records.',
  },
  {
    documentNumber: 'BPA-2026-PEND-7788',
    documentType: 'BUILDING_PLAN_APPROVAL',
    issuerName: 'Pune Municipal Corporation Urban Development Cell',
    institutionName: 'Demo Institute of Technology',
    state: 'Maharashtra',
    district: 'Pune',
    registrationDate: '2026-01-10T00:00:00.000Z',
    issuanceStatus: 'PENDING',
    sourceReference: 'ACK-PMC-2026-1102-SIMULATED',
    scenario: 'PENDING',
    discrepancyDescription:
      'Municipal building sanction application is currently pending environmental clearance.',
  },
  {
    documentNumber: 'MAH-SRV-UNAVAIL-503',
    documentType: 'LAND_TITLE_DEED',
    issuerName:
      'Department of Revenue & Land Records, Government of Maharashtra',
    institutionName: 'Demo Institute of Technology',
    state: 'Maharashtra',
    district: 'Pune',
    registrationDate: '2024-01-01T00:00:00.000Z',
    issuanceStatus: 'ACTIVE',
    sourceReference: 'SRV-ERR-TIMEOUT',
    scenario: 'UNAVAILABLE',
    discrepancyDescription: 'Simulated 503 gateway unavailable error.',
  },
];

export function findSyntheticRecordByDocumentNumber(
  documentNumber: string,
): SyntheticIssuerRecord | undefined {
  const normalized = documentNumber.trim().toUpperCase();
  return SYNTHETIC_ISSUER_REGISTRY.find(
    (record) => record.documentNumber.toUpperCase() === normalized,
  );
}

export function findSyntheticRecordByLandIdentifiers(
  khasraNumber: string,
  district?: string,
): SyntheticIssuerRecord | undefined {
  const normKhasra = khasraNumber.trim().toUpperCase();
  const normDistrict = district?.trim().toUpperCase();

  return SYNTHETIC_ISSUER_REGISTRY.find((record) => {
    if (!record.khasraNumber) return false;
    const khasraMatches = record.khasraNumber.toUpperCase() === normKhasra;
    if (!khasraMatches) return false;
    if (normDistrict) {
      return record.district.toUpperCase() === normDistrict;
    }
    return true;
  });
}

export function getSyntheticRecordByScenario(
  scenario: SimulationScenario,
): SyntheticIssuerRecord | undefined {
  return SYNTHETIC_ISSUER_REGISTRY.find((rec) => rec.scenario === scenario);
}
