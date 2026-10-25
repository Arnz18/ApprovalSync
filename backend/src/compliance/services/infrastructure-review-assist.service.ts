/**
 * ApprovalSync — Infrastructure Evidence Review Assist Service
 * Milestone: DOC-06
 *
 * Implements practical, explainable documentary review assistance for physical campus
 * infrastructure (land parcel, built-up instructional area, barrier-free access, and fire safety).
 *
 * Enforces ADR-004 Human Sovereignty:
 * - Purely advisory findings with explicit heuristic limitations.
 * - Never claims 2D scans or images prove physical facility existence, dimensions, or structural safety.
 * - Flags cases where on-site physical inspection by the Expert Visit Committee (EVC) is required.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import { ComplianceSeverity } from '../../shared/contracts';
import {
  ComplianceFinding,
  InfrastructureMetricComparison,
  InfrastructureReviewSummary,
} from '../interfaces';

export const STANDARD_HEURISTIC_LIMITATIONS = [
  'Documentary review is conducted via OCR field extraction and metadata consistency heuristics.',
  '2D scans or image uploads cannot authenticate physical facility existence, room dimensions, or structural load-bearing capacity.',
  'Statutory physical compliance requires on-site inspection and verification by the AICTE Expert Visit Committee (EVC).',
];

@Injectable()
export class InfrastructureReviewAssistService {
  private readonly logger = new Logger(InfrastructureReviewAssistService.name);

  /**
   * Performs an explainable documentary review assist on physical infrastructure evidence.
   */
  public reviewInfrastructureEvidence(
    application: Application,
    documents: Document[],
  ): {
    summary: InfrastructureReviewSummary;
    comparisons: InfrastructureMetricComparison[];
    findings: ComplianceFinding[];
  } {
    this.logger.debug(
      `Executing infrastructure evidence review assist for application='${application.applicationNumber}'`,
    );

    const payload = (application.payloadJsonb || {}) as Record<string, any>;
    const findings: ComplianceFinding[] = [];
    const comparisons: InfrastructureMetricComparison[] = [];
    const inspectionTriggers: string[] = [];

    // 1. Locate relevant infrastructure documents
    const landDoc = documents.find((d) => d.documentType === 'LAND_TITLE_DEED');
    const buildingDoc = documents.find(
      (d) => d.documentType === 'BUILDING_PLAN_APPROVAL',
    );
    const cluDoc = documents.find(
      (d) => d.documentType === 'LAND_USE_CERTIFICATE',
    );
    const fireDoc = documents.find(
      (d) => d.documentType === 'FIRE_SAFETY_CERTIFICATE',
    );
    const barrierDoc = documents.find(
      (d) =>
        d.documentType === 'AFFIDAVIT_COMPLIANCE' &&
        ((d.fileName && /barrier|ramp|architect|access/i.test(d.fileName)) ||
          d.metadata?.isBarrierFreeCert),
    );

    const landExtracted =
      (landDoc?.metadata?.analysisReport as any)?.extractedFields || {};
    const buildingExtracted =
      (buildingDoc?.metadata?.analysisReport as any)?.extractedFields || {};
    const fireExtracted =
      (fireDoc?.metadata?.analysisReport as any)?.extractedFields || {};

    // --- CHECK 1: Land Area Consistency ---
    const declaredLandAcres = payload.landAreaAcres
      ? Number(payload.landAreaAcres)
      : null;
    const extractedLandAcres = landExtracted.landAreaAcres
      ? Number(landExtracted.landAreaAcres)
      : null;

    let landCompliant = true;
    if (declaredLandAcres !== null && extractedLandAcres !== null) {
      const diff = Math.abs(declaredLandAcres - extractedLandAcres);
      const deviationPct = (diff / Math.max(declaredLandAcres, 1)) * 100;

      if (deviationPct > 10) {
        landCompliant = false;
        inspectionTriggers.push(
          `Land area discrepancy: intake declared ${declaredLandAcres} acres, but registered deed reflects ${extractedLandAcres} acres (${deviationPct.toFixed(1)}% deviation).`,
        );

        findings.push({
          id: uuidv4(),
          findingCode: 'DISCREPANCY_LAND_AREA_MISMATCH',
          title: `Discrepancy: Declared vs Title Deed Land Area (${declaredLandAcres} vs ${extractedLandAcres} Acres)`,
          description: `Discrepancy detected between declared intake acreage (${declaredLandAcres} acres) and registered sale/lease deed (${extractedLandAcres} acres). Deviation exceeds 10%.`,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          isAdvisory: true,
          category: 'INFRASTRUCTURE',
          evidence: [
            {
              documentId: landDoc?.id,
              documentType: 'LAND_TITLE_DEED',
              fileName: landDoc?.fileName,
              fieldKey: 'landAreaAcres',
              extractedValue: extractedLandAcres,
              declaredValue: declaredLandAcres,
              notes: `Deviation: ${deviationPct.toFixed(1)}%`,
            },
          ],
          requiresPhysicalInspection: true,
          recommendedAction:
            'EVC inspector must physically verify survey boundary markers and revenue khata extract.',
          limitations: [
            'Comparison based on OCR extracted land area vs application profile entry.',
          ],
        });
      }

      comparisons.push({
        metricName: 'Land Area',
        declaredValue: declaredLandAcres,
        extractedValue: extractedLandAcres,
        regulatoryStandard: 7.5,
        unit: 'Acres',
        status: deviationPct > 10 ? 'DISCREPANCY' : 'COMPLIANT',
        deviationPercentage: Number(deviationPct.toFixed(1)),
        notes: `Land Title Deed Deed No: ${landExtracted.deedNumber || 'N/A'}`,
      });
    } else {
      if (declaredLandAcres !== null && declaredLandAcres < 7.5) {
        landCompliant = false;
      }
    }

    // --- CHECK 2: Built-Up Area Plausibility (Carpet vs Built-Up) ---
    const declaredBuiltUpSqm = payload.builtUpAreaSqMeters
      ? Number(payload.builtUpAreaSqMeters)
      : null;
    const extractedBuiltUpSqm = buildingExtracted.totalBuiltUpAreaSqm
      ? Number(buildingExtracted.totalBuiltUpAreaSqm)
      : null;
    const extractedCarpetSqm = buildingExtracted.carpetAreaSqm
      ? Number(buildingExtracted.carpetAreaSqm)
      : null;

    let builtUpAreaCompliant = true;
    if (extractedCarpetSqm !== null && extractedBuiltUpSqm !== null) {
      if (extractedCarpetSqm > extractedBuiltUpSqm) {
        builtUpAreaCompliant = false;
        inspectionTriggers.push(
          `Building plan anomaly: carpet area (${extractedCarpetSqm} sq.m) exceeds total built-up area (${extractedBuiltUpSqm} sq.m).`,
        );

        findings.push({
          id: uuidv4(),
          findingCode: 'ANOMALY_CARPET_EXCEEDS_BUILTUP',
          title: 'Structural Anomaly: Carpet Area Exceeds Total Built-Up Area',
          description: `Extracted carpet area (${extractedCarpetSqm} sq.m) exceeds total sanctioned built-up area (${extractedBuiltUpSqm} sq.m) in approved building plan. This is geometrically impossible and indicates an OCR error or fraudulent document alteration.`,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          isAdvisory: true,
          category: 'INFRASTRUCTURE',
          evidence: [
            {
              documentId: buildingDoc?.id,
              documentType: 'BUILDING_PLAN_APPROVAL',
              fileName: buildingDoc?.fileName,
              fieldKey: 'carpetAreaSqm',
              extractedValue: extractedCarpetSqm,
              declaredValue: declaredBuiltUpSqm,
              notes: `Built-up Area: ${extractedBuiltUpSqm} sq.m`,
            },
          ],
          requiresPhysicalInspection: true,
          recommendedAction:
            'Scrutiny officer must manually inspect original municipal sanction drawing and schedule EVC tape-measurement.',
          limitations: [
            'Heuristic area check evaluated from municipal plan schedules.',
          ],
        });
      }
    }

    if (declaredBuiltUpSqm !== null && extractedBuiltUpSqm !== null) {
      const builtUpDiff = Math.abs(declaredBuiltUpSqm - extractedBuiltUpSqm);
      const builtUpDevPct =
        (builtUpDiff / Math.max(declaredBuiltUpSqm, 1)) * 100;

      if (builtUpDevPct > 15) {
        builtUpAreaCompliant = false;
        inspectionTriggers.push(
          `Built-up area mismatch: declared ${declaredBuiltUpSqm} sq.m vs sanctioned ${extractedBuiltUpSqm} sq.m (${builtUpDevPct.toFixed(1)}% deviation).`,
        );

        findings.push({
          id: uuidv4(),
          findingCode: 'DISCREPANCY_BUILTUP_MISMATCH',
          title: `Discrepancy: Declared vs Sanctioned Built-Up Area (${declaredBuiltUpSqm} vs ${extractedBuiltUpSqm} Sq.m)`,
          description: `Declared instructional/administrative space (${declaredBuiltUpSqm} sq.m) deviates significantly from municipal sanction approval (${extractedBuiltUpSqm} sq.m).`,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          isAdvisory: true,
          category: 'INFRASTRUCTURE',
          evidence: [
            {
              documentId: buildingDoc?.id,
              documentType: 'BUILDING_PLAN_APPROVAL',
              fileName: buildingDoc?.fileName,
              fieldKey: 'totalBuiltUpAreaSqm',
              extractedValue: extractedBuiltUpSqm,
              declaredValue: declaredBuiltUpSqm,
              notes: `Sanction Number: ${buildingExtracted.approvalNumber || 'N/A'}`,
            },
          ],
          requiresPhysicalInspection: true,
          recommendedAction:
            'EVC committee must verify physical construction stages and sanctioned floor space.',
          limitations: ['Evaluated from municipal plan schedule figures.'],
        });
      }

      comparisons.push({
        metricName: 'Built-up Area',
        declaredValue: declaredBuiltUpSqm,
        extractedValue: extractedBuiltUpSqm,
        regulatoryStandard: 4000,
        unit: 'Sq.m',
        status: builtUpDevPct > 15 ? 'DISCREPANCY' : 'COMPLIANT',
        deviationPercentage: Number(builtUpDevPct.toFixed(1)),
        notes: `Sanction Authority: ${buildingExtracted.issuingAuthority || 'Local Authority'}`,
      });
    }

    // --- CHECK 3: Land Use Certificate Verification ---
    if (!cluDoc) {
      inspectionTriggers.push(
        'Land Use Certificate (CLU) is missing: statutory educational land conversion cannot be verified remotely.',
      );
      findings.push({
        id: uuidv4(),
        findingCode: 'FLAG_CLU_MISSING',
        title: 'Advisory: Change of Land Use (CLU) Certificate Not Uploaded',
        description:
          'No Change of Land Use (CLU) order attached confirming educational zoning for the campus parcel. Agricultural or industrial land cannot be used without revenue conversion.',
        severity: ComplianceSeverity.ADVISORY_FLAG,
        isAdvisory: true,
        category: 'INFRASTRUCTURE',
        evidence: [],
        requiresPhysicalInspection: true,
        recommendedAction:
          'Applicant must submit competent revenue authority order confirming non-agricultural educational land conversion.',
        limitations: [
          'Zoning classification cannot be verified without revenue authority order.',
        ],
      });
    }

    // --- CHECK 4: Barrier-Free Access and Physical Plant Heuristics ---
    const barrierFreeDeclared = Boolean(
      payload.barrierFreeFacilities || payload.hasRampsAndLifts || barrierDoc,
    );

    if (!barrierFreeDeclared) {
      inspectionTriggers.push(
        'No barrier-free accessibility certificate or declaration found: physical verification of ramps, lifts, and accessible facilities required.',
      );
      findings.push({
        id: uuidv4(),
        findingCode: 'FLAG_BARRIER_FREE_MISSING',
        title: 'Review Assist: Barrier-Free Facilities Certification Missing',
        description:
          'Neither Council of Architecture (COA) architect certificate nor barrier-free compliance declaration was identified. Mandatory under Rights of Persons with Disabilities Act & AICTE norms.',
        severity: ComplianceSeverity.ADVISORY_FLAG,
        isAdvisory: true,
        category: 'SAFETY_ACCESSIBILITY',
        evidence: [],
        requiresPhysicalInspection: true,
        recommendedAction:
          'EVC inspection committee must inspect campus accessibility ramps, lifts, and specialized sanitation facilities.',
        limitations: [
          'Documentary review cannot verify physical ramp gradient slope (1:12) or elevator dimensions.',
        ],
      });
    } else {
      inspectionTriggers.push(
        'Barrier-free access declared: EVC inspection required to verify operational lift and ramp slope gradient.',
      );
    }

    // --- CHECK 5: Fire Safety Validity ---
    let fireSafetyValid = true;
    if (fireDoc && fireExtracted.expiryDate) {
      const expDate = new Date(fireExtracted.expiryDate);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        fireSafetyValid = false;
        inspectionTriggers.push(
          `Fire Safety Certificate expired on ${expDate.toISOString().split('T')[0]}: physical safety compliance compromised.`,
        );
      }
    } else if (!fireDoc) {
      fireSafetyValid = false;
      inspectionTriggers.push(
        'Fire Safety Certificate not uploaded: physical fire-fighting preparedness cannot be evaluated.',
      );
    }

    // --- EVC Recommendation Determination ---
    const evcInspectionRecommended = inspectionTriggers.length > 0;

    if (evcInspectionRecommended) {
      findings.push({
        id: uuidv4(),
        findingCode: 'FLAG_EVC_INSPECTION_RECOMMENDED',
        title: 'EVC Review Assist: On-Site Physical Inspection Recommended',
        description: `Based on automated documentary review, ${inspectionTriggers.length} infrastructure item(s) require physical verification by the Expert Visit Committee (EVC).`,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        isAdvisory: true,
        category: 'INFRASTRUCTURE',
        evidence: inspectionTriggers.map((reason) => ({ notes: reason })),
        requiresPhysicalInspection: true,
        recommendedAction:
          'Provide inspection trigger checklist to assigned EVC inspection panel.',
        limitations: STANDARD_HEURISTIC_LIMITATIONS,
      });
    }

    const summary: InfrastructureReviewSummary = {
      landCompliant,
      builtUpAreaCompliant,
      barrierFreeDeclared,
      fireSafetyValid,
      evcInspectionRecommended,
      inspectionTriggerReasons: inspectionTriggers,
      heuristicLimitations: STANDARD_HEURISTIC_LIMITATIONS,
    };

    return {
      summary,
      comparisons,
      findings,
    };
  }
}
