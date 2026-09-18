import { describe, expect, it } from 'vitest';
import type { ReadingQuestionDraft } from './types';
import { linkVisualQuestions } from './visual-region-linker';

function question(number: number, type: ReadingQuestionDraft['type']): ReadingQuestionDraft {
  return {
    id: `q-${number}`,
    number,
    type,
    prompt: `Question ${number}`,
    instructionConstraints: {},
    evidence: [
      {
        documentId: 'reading-pdf',
        pageNumber: number <= 4 ? 3 : 11,
        method: 'PDF_TEXT',
      },
    ],
  };
}

describe('linkVisualQuestions', () => {
  it('links diagram and table question groups to their retained source regions', () => {
    const result = linkVisualQuestions({
      questions: [
        question(1, 'DIAGRAM_LABEL_COMPLETION'),
        question(2, 'DIAGRAM_LABEL_COMPLETION'),
        question(28, 'TABLE_COMPLETION'),
        question(29, 'TABLE_COMPLETION'),
      ],
      regions: [
        {
          id: 'diagram-page-3',
          sourceDocumentId: 'reading-pdf',
          pageNumber: 3,
          kind: 'DIAGRAM',
          crop: { x: 0.1, y: 0.25, width: 0.8, height: 0.5 },
        },
        {
          id: 'table-page-11',
          sourceDocumentId: 'reading-pdf',
          pageNumber: 11,
          kind: 'TABLE',
          crop: { x: 0.05, y: 0.45, width: 0.9, height: 0.4 },
        },
      ],
    });

    expect(result.anchors.map((anchor) => ({
      questionNumber: anchor.questionNumber,
      visualRegionId: anchor.visualRegionId,
    }))).toEqual([
      { questionNumber: 1, visualRegionId: 'diagram-page-3' },
      { questionNumber: 2, visualRegionId: 'diagram-page-3' },
      { questionNumber: 28, visualRegionId: 'table-page-11' },
      { questionNumber: 29, visualRegionId: 'table-page-11' },
    ]);
  });

  it('requires review when exact answer anchor geometry is unavailable', () => {
    const result = linkVisualQuestions({
      questions: [question(1, 'DIAGRAM_LABEL_COMPLETION')],
      regions: [
        {
          id: 'diagram-page-3',
          sourceDocumentId: 'reading-pdf',
          pageNumber: 3,
          kind: 'DIAGRAM',
          crop: { x: 0.1, y: 0.25, width: 0.8, height: 0.5 },
        },
      ],
    });

    expect(result.anchors[0]).toMatchObject({
      questionNumber: 1,
      visualRegionId: 'diagram-page-3',
      anchor: null,
      verificationState: 'REVIEW_REQUIRED',
    });
    expect(result.reviewItems).toContainEqual(
      expect.objectContaining({
        kind: 'VISUAL_ANCHOR',
        questionNumber: 1,
      }),
    );
  });
});
