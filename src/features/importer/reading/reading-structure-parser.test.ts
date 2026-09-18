import { describe, expect, it } from 'vitest';
import fixture from '../../../../tests/fixtures/reading-import/fixture.json';
import type { ReadingSourceBlock } from './types';
import { buildStructuredReadingDraft } from './reading-structure-parser';

function sourceBlocks(): ReadingSourceBlock[] {
  return fixture.blocks.map((block) => ({
    ...block,
    evidence: [
      {
        documentId: 'reading-pdf',
        pageNumber: block.pageNumber,
        method: 'PDF_TEXT' as const,
      },
    ],
  }));
}

function allQuestions(
  draft: ReturnType<typeof buildStructuredReadingDraft>,
) {
  return draft.sections.flatMap((section) =>
    section.questionGroups.flatMap((group) => group.questions),
  );
}

describe('buildStructuredReadingDraft', () => {
  it('builds three passages and forty typed questions from the fixture', () => {
    const draft = buildStructuredReadingDraft({
      blocks: sourceBlocks(),
      visualRegions: [
        {
          id: 'diagram-page-3',
          sourceDocumentId: 'reading-pdf',
          pageNumber: 3,
          kind: 'DIAGRAM',
          crop: { x: 0.1, y: 0.2, width: 0.8, height: 0.5 },
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

    expect(draft.sections).toHaveLength(3);
    expect(allQuestions(draft)).toHaveLength(40);
    expect(draft.reviewItems).toEqual([]);

    expect(
      draft.sections.flatMap((section) =>
        section.questionGroups.map((group) => [
          `${group.startQuestion}-${group.endQuestion}`,
          group.type,
        ]),
      ),
    ).toEqual([
      ['1-4', 'DIAGRAM_LABEL_COMPLETION'],
      ['5-9', 'MATCHING_SENTENCE_ENDINGS'],
      ['10-14', 'TRUE_FALSE_NOT_GIVEN'],
      ['15-19', 'SHORT_ANSWER'],
      ['20-24', 'MATCHING_HEADINGS'],
      ['25-27', 'SINGLE_CHOICE'],
      ['28-31', 'TABLE_COMPLETION'],
      ['32-36', 'MATCHING_INFORMATION'],
      ['37-40', 'MATCHING_FEATURES'],
    ]);
  });

  it('creates a review item instead of inventing a missing question prompt', () => {
    const blocks = sourceBlocks().map((block) =>
      block.text.includes('32 Information thirty-two')
        ? { ...block, text: block.text.replace('32 Information thirty-two\n', '') }
        : block,
    );

    const draft = buildStructuredReadingDraft({
      blocks,
      visualRegions: [],
    });

    expect(allQuestions(draft).some((question) => question.number === 32)).toBe(false);
    expect(draft.reviewItems).toContainEqual(
      expect.objectContaining({
        kind: 'QUESTION_TEXT',
        questionNumber: 32,
        message: 'Question 32 text could not be extracted reliably',
      }),
    );
  });
});
