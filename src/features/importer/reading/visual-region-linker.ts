import type { NormalizedRect } from '../domain';
import type { StructuredQuestionGroupDraft } from './reading-structure';

export interface VisualPageEvidence {
  documentId: string;
  pageNumber: number;
  regions: NormalizedRect[];
}

export interface VisualRegionCandidate {
  crop: NormalizedRect | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export function linkVisualRegion(
  group: StructuredQuestionGroupDraft,
  page: VisualPageEvidence,
): VisualRegionCandidate {
  if (group.pageNumber !== page.pageNumber) {
    return {
      crop: null,
      confidence: 'LOW',
      reasons: [`Visual evidence is from page ${page.pageNumber}, not question page ${group.pageNumber}`],
    };
  }

  if (page.regions.length === 0) {
    const label = group.questionType === 'DIAGRAM_LABEL_COMPLETION' ? 'diagram' : 'visual';
    return {
      crop: null,
      confidence: 'LOW',
      reasons: [`No reliable ${label} region was found on source page ${group.pageNumber}`],
    };
  }

  if (page.regions.length > 1) {
    return {
      crop: null,
      confidence: 'LOW',
      reasons: [`Multiple visual regions compete on source page ${group.pageNumber}`],
    };
  }

  return {
    crop: page.regions[0],
    confidence: 'HIGH',
    reasons: ['One visual region matches the question source page'],
  };
}
