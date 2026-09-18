import { describe, expect, it } from 'vitest';
import type { StructuredQuestionGroupDraft } from './reading-structure';
import { linkVisualRegion } from './visual-region-linker';

function diagramGroup(): StructuredQuestionGroupDraft {
  return {
    id: 'questions-1-4',
    range: [1, 4],
    pageNumber: 3,
    sourceText: 'Questions 1-4 Label the diagram below.',
    questionType: 'DIAGRAM_LABEL_COMPLETION',
    questions: [],
    evidence: [{ documentId: 'doc-1', pageNumber: 3, method: 'PDF_TEXT' }],
  };
}

describe('linkVisualRegion', () => {
  it('requires review instead of inventing a crop when no reliable region exists', () => {
    expect(
      linkVisualRegion(diagramGroup(), {
        documentId: 'doc-1',
        pageNumber: 3,
        regions: [],
      }),
    ).toEqual({
      crop: null,
      confidence: 'LOW',
      reasons: ['No reliable diagram region was found on source page 3'],
    });
  });

  it('accepts one unambiguous visual region as a high-confidence candidate', () => {
    const crop = { x: 0.1, y: 0.2, width: 0.7, height: 0.5 };
    expect(
      linkVisualRegion(diagramGroup(), {
        documentId: 'doc-1',
        pageNumber: 3,
        regions: [crop],
      }),
    ).toEqual({
      crop,
      confidence: 'HIGH',
      reasons: ['One visual region matches the question source page'],
    });
  });

  it('requires review when multiple visual regions compete', () => {
    expect(
      linkVisualRegion(diagramGroup(), {
        documentId: 'doc-1',
        pageNumber: 3,
        regions: [
          { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
          { x: 0.5, y: 0.5, width: 0.3, height: 0.3 },
        ],
      }),
    ).toMatchObject({
      crop: null,
      confidence: 'LOW',
    });
  });
});
