/**
 * ApprovalSync — Document Classification Service
 * Milestone: DOC-02
 *
 * Identifies supported AICTE document categories using keyword frequency,
 * syntactic cues, and regulatory statutory markers. Emits explicit UNKNOWN
 * results for unsupported or unreadable files.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentClassificationResult,
  IDocumentClassifier,
  SupportedDocumentCategory,
} from '../interfaces/document-classifier.interface';

interface CategoryRule {
  category: SupportedDocumentCategory;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  weight: number;
}

@Injectable()
export class DocumentClassificationService implements IDocumentClassifier {
  private readonly logger = new Logger(DocumentClassificationService.name);

  private readonly rules: CategoryRule[] = [
    {
      category: SupportedDocumentCategory.LAND_TITLE_DEED,
      primaryKeywords: [
        'lease deed',
        'sale deed',
        'sub-registrar',
        'khasra',
        'survey number',
        'survey no',
        'tenure of lease',
        'lessor',
        'lessee',
        'title deed',
      ],
      secondaryKeywords: [
        'land area',
        'acres',
        'schedule of property',
        'stamp duty',
        'encumbrance',
        'mutation',
      ],
      weight: 1.0,
    },
    {
      category: SupportedDocumentCategory.BUILDING_PLAN_APPROVAL,
      primaryKeywords: [
        'building plan',
        'sanctioned plan',
        'approval number',
        'built-up area',
        'floor area ratio',
        'town planning',
        'municipal corporation',
        'plinth area',
      ],
      secondaryKeywords: [
        'far',
        'carpet area',
        'structural safety',
        'occupancy certificate',
        'sanction date',
      ],
      weight: 1.0,
    },
    {
      category: SupportedDocumentCategory.LAND_USE_CERTIFICATE,
      primaryKeywords: [
        'change of land use',
        'clu',
        'conversion certificate',
        'agricultural to educational',
        'zoning certificate',
      ],
      secondaryKeywords: [
        'revenue department',
        'competent authority',
        'permitted use',
        'collector',
        'tehsildar',
      ],
      weight: 1.0,
    },
    {
      category: SupportedDocumentCategory.FIRE_SAFETY_CERTIFICATE,
      primaryKeywords: [
        'fire safety',
        'fire noc',
        'fire prevention',
        'life safety',
        'chief fire officer',
      ],
      secondaryKeywords: [
        'fire extinguisher',
        'emergency evacuation',
        'hydrant',
        'fire clearance',
        'valid up to',
      ],
      weight: 1.0,
    },
    {
      category: SupportedDocumentCategory.SOCIETY_TRUST_REGISTRATION,
      primaryKeywords: [
        'societies registration',
        'public trust',
        'trust deed',
        'memorandum of association',
        'registrar of societies',
      ],
      secondaryKeywords: [
        'trustees',
        'charity commissioner',
        'bylaws',
        'society registration act',
      ],
      weight: 1.0,
    },
    {
      category: SupportedDocumentCategory.AICTE_APPROVAL_LETTER,
      primaryKeywords: [
        'all india council for technical education',
        'extension of approval',
        'eoa',
        'approval process handbook',
        'f.no.',
      ],
      secondaryKeywords: [
        'nelson mandela marg',
        'aicte',
        'intake capacity',
        'academic year',
      ],
      weight: 1.0,
    },
  ];

  /**
   * Classifies text into one of the supported document categories.
   */
  async classify(
    rawText: string,
    _tokens?: Array<{ text: string }>,
  ): Promise<DocumentClassificationResult> {
    void _tokens;
    if (!rawText || rawText.trim().length === 0) {
      return {
        category: SupportedDocumentCategory.UNKNOWN,
        confidenceScore: 0.0,
        matchedKeywords: [],
        isRecognized: false,
      };
    }

    const normalizedText = rawText.toLowerCase();
    const scores: Array<{
      category: SupportedDocumentCategory;
      score: number;
      matchedKeywords: string[];
    }> = [];

    for (const rule of this.rules) {
      const matchedPrimary = rule.primaryKeywords.filter((kw) =>
        normalizedText.includes(kw),
      );
      const matchedSecondary = rule.secondaryKeywords.filter((kw) =>
        normalizedText.includes(kw),
      );

      // Scoring heuristic: Primary keyword = 2.0 pts, Secondary = 1.0 pt
      const rawScore =
        matchedPrimary.length * 2.0 + matchedSecondary.length * 1.0;
      const maxPossibleScore =
        rule.primaryKeywords.length * 2.0 + rule.secondaryKeywords.length * 1.0;
      const normalizedScore = Number(
        Math.min(0.99, rawScore / (maxPossibleScore * 0.45)).toFixed(3),
      );

      const allMatched = [...matchedPrimary, ...matchedSecondary];

      scores.push({
        category: rule.category,
        score: rawScore > 0 ? normalizedScore : 0,
        matchedKeywords: allMatched,
      });
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    const topMatch = scores[0];

    // Require at least 2 matched keywords and a score >= 0.40 to declare recognized
    if (
      !topMatch ||
      topMatch.matchedKeywords.length < 2 ||
      topMatch.score < 0.4
    ) {
      this.logger.debug(
        `Document classification could not match any supported category with high confidence. Top score: ${topMatch?.score ?? 0}`,
      );

      return {
        category: SupportedDocumentCategory.UNKNOWN,
        confidenceScore: topMatch?.score ?? 0,
        matchedKeywords: topMatch?.matchedKeywords ?? [],
        isRecognized: false,
        alternativeMatches: scores.slice(0, 3).map((s) => ({
          category: s.category,
          score: s.score,
        })),
      };
    }

    return {
      category: topMatch.category,
      confidenceScore: topMatch.score,
      matchedKeywords: topMatch.matchedKeywords,
      isRecognized: true,
      alternativeMatches: scores.slice(1, 3).map((s) => ({
        category: s.category,
        score: s.score,
      })),
    };
  }
}
