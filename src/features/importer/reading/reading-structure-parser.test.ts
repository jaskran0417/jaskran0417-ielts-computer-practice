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


    const questions = allQuestions(draft);
    expect(questions.find((question) => question.number === 5)?.options).toHaveLength(9);
    expect(questions.find((question) => question.number === 20)?.options?.[0]).toEqual({
      id: 'i',
      label: 'Heading one',
    });
    expect(questions.find((question) => question.number === 25)?.options).toEqual([
      { id: 'A', label: 'Q25 alpha' },
      { id: 'B', label: 'Q25 bravo' },
      { id: 'C', label: 'Q25 charlie' },
      { id: 'D', label: 'Q25 delta' },
    ]);
    expect(questions.find((question) => question.number === 32)?.options).toHaveLength(6);
    expect(questions.find((question) => question.number === 37)?.options).toHaveLength(5);

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
  it('keeps passage continuation text from later PDF pages before the question pages', () => {
    const draft = buildStructuredReadingDraft({
      blocks: [
        {
          pageNumber: 1,
          text: [
            'Passage 1',
            'A Test Passage',
            'First paragraph on page one.',
          ].join('\n'),
          evidence: [{ documentId: 'pdf', pageNumber: 1, method: 'PDF_TEXT' }],
        },
        {
          pageNumber: 2,
          text: 'Continuation paragraph on page two.',
          evidence: [{ documentId: 'pdf', pageNumber: 2, method: 'PDF_TEXT' }],
        },
        {
          pageNumber: 3,
          text: [
            'Questions 1-1',
            'Answer the questions using NO MORE THAN TWO WORDS.',
            '1. What is being tested?',
          ].join('\n'),
          evidence: [{ documentId: 'pdf', pageNumber: 3, method: 'PDF_TEXT' }],
        },
      ],
      visualRegions: [],
    });

    expect(draft.sections[0]?.passageText).toEqual([
      'First paragraph on page one.',
      'Continuation paragraph on page two.',
    ]);
    expect(draft.sections[0]?.passageText.join(' ')).not.toContain('Questions 1-1');
  });


  it('attaches shared matching options even when they appear later on the same page', () => {
    const draft = buildStructuredReadingDraft({
      blocks: [
        {
          pageNumber: 1,
          text: ['Passage 1', 'A passage', 'Passage text.'].join('\n'),
          evidence: [{ documentId: 'pdf', pageNumber: 1, method: 'PDF_TEXT' }],
        },
        {
          pageNumber: 4,
          text: [
            'Questions 5-9',
            'Complete each sentence with the correct ending A-I below.',
            '5. Stem five',
            '6. Stem six',
            '7. Stem seven',
            '8. Stem eight',
            '9. Stem nine',
            'Questions 10-14',
            'Do the following statements agree? TRUE FALSE NOT GIVEN',
            '10. Statement ten',
            '11. Statement eleven',
            '12. Statement twelve',
            '13. Statement thirteen',
            '14. Statement fourteen',
            'A. Ending alpha',
            'B. Ending bravo',
            'C. Ending charlie',
            'D. Ending delta',
            'E. Ending echo',
            'F. Ending foxtrot',
            'G. Ending golf',
            'H. Ending hotel',
            'I. Ending india',
          ].join('\n'),
          evidence: [{ documentId: 'pdf', pageNumber: 4, method: 'PDF_TEXT' }],
        },
      ],
      visualRegions: [],
    });

    const group = draft.sections[0]?.questionGroups.find(
      (candidate) => candidate.startQuestion === 5,
    );

    expect(group?.questions[0]?.options).toHaveLength(9);
    expect(group?.questions[0]?.options?.[0]).toEqual({
      id: 'A',
      label: 'Ending alpha',
    });
    expect(group?.questions[4]?.options?.[8]).toEqual({
      id: 'I',
      label: 'Ending india',
    });
  });

  it('attaches per-question A-D options to single-choice questions', () => {
    const draft = buildStructuredReadingDraft({
      blocks: [
        {
          pageNumber: 1,
          text: ['Passage 1', 'A passage', 'Passage text.'].join('\n'),
          evidence: [{ documentId: 'pdf', pageNumber: 1, method: 'PDF_TEXT' }],
        },
        {
          pageNumber: 2,
          text: [
            'Questions 25-26',
            'Choose the appropriate letter A, B, C or D.',
            '25. First question?',
            'A. Alpha',
            'B. Bravo',
            'C. Charlie',
            'D. Delta',
            '26. Second question?',
            'A. One',
            'B. Two',
            'C. Three',
            'D. Four',
          ].join('\n'),
          evidence: [{ documentId: 'pdf', pageNumber: 2, method: 'PDF_TEXT' }],
        },
      ],
      visualRegions: [],
    });

    const questions = draft.sections[0]?.questionGroups[0]?.questions ?? [];
    expect(questions[0]?.options).toEqual([
      { id: 'A', label: 'Alpha' },
      { id: 'B', label: 'Bravo' },
      { id: 'C', label: 'Charlie' },
      { id: 'D', label: 'Delta' },
    ]);
    expect(questions[1]?.options?.[3]).toEqual({ id: 'D', label: 'Four' });
  });


  it('creates deterministic diagram label prompts when labels live only inside the image', () => {
    const draft = buildStructuredReadingDraft({
      blocks: [
        {
          pageNumber: 1,
          text: ['Passage 1', 'Visual passage', 'Passage text'].join('\n'),
          evidence: [{ documentId: 'reading-pdf', pageNumber: 1, method: 'PDF_TEXT' as const }],
        },
        {
          pageNumber: 3,
          text: [
            'Questions 1-4',
            'Label the diagram below with the names of the layers of the sun.',
            'Choose NO MORE THAN TWO WORDS from the reading passage for each answer.',
          ].join('\n'),
          evidence: [{ documentId: 'reading-pdf', pageNumber: 3, method: 'PDF_TEXT' as const }],
        },
      ],
      visualRegions: [
        {
          id: 'diagram-page-3',
          sourceDocumentId: 'reading-pdf',
          pageNumber: 3,
          kind: 'DIAGRAM',
          crop: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    });

    const questions = draft.sections[0]?.questionGroups[0]?.questions ?? [];
    expect(questions.map((question) => question.prompt)).toEqual([
      'Label 1',
      'Label 2',
      'Label 3',
      'Label 4',
    ]);
  });
});
