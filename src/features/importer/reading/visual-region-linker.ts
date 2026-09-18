import type {
  ImportedVisualRegion,
  ReadingQuestionDraft,
  StructureReviewItem,
  VisualAnchorDraft,
} from './types';

function expectedVisualKind(
  question: ReadingQuestionDraft,
): ImportedVisualRegion['kind'] | null {
  if (question.type === 'DIAGRAM_LABEL_COMPLETION') return 'DIAGRAM';
  if (question.type === 'TABLE_COMPLETION') return 'TABLE';
  return null;
}

export function linkVisualQuestions(input: {
  questions: ReadingQuestionDraft[];
  regions: ImportedVisualRegion[];
}): {
  anchors: VisualAnchorDraft[];
  reviewItems: StructureReviewItem[];
} {
  const anchors: VisualAnchorDraft[] = [];
  const reviewItems: StructureReviewItem[] = [];

  for (const question of input.questions) {
    const kind = expectedVisualKind(question);
    if (!kind) continue;

    const evidencePages = new Set(
      question.evidence.map((evidence) => evidence.pageNumber),
    );
    const compatible = input.regions.filter(
      (region) => region.kind === kind && evidencePages.has(region.pageNumber),
    );

    if (compatible.length !== 1) {
      reviewItems.push({
        id: `visual-region-${question.number}`,
        kind: 'VISUAL_ANCHOR',
        questionNumber: question.number,
        message:
          compatible.length === 0
            ? `Question ${question.number} has no matching visual region`
            : `Question ${question.number} has multiple possible visual regions`,
        evidence: question.evidence,
      });
      continue;
    }

    const region = compatible[0];
    anchors.push({
      questionNumber: question.number,
      visualRegionId: region.id,
      anchor: null,
      verificationState: 'REVIEW_REQUIRED',
    });

    reviewItems.push({
      id: `visual-anchor-${question.number}`,
      kind: 'VISUAL_ANCHOR',
      questionNumber: question.number,
      message: `Question ${question.number} answer anchor requires confirmation`,
      evidence: question.evidence,
    });
  }

  return { anchors, reviewItems };
}
