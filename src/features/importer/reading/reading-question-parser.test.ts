import { describe, expect, it } from 'vitest';
import { parseStructuredQuestionGroup } from './reading-question-parser';
import type { StructuredQuestionGroupDraft } from './reading-structure';

function group(
  range: readonly [number, number],
  questionType: StructuredQuestionGroupDraft['questionType'],
  sourceText: string,
): StructuredQuestionGroupDraft {
  return {
    id: `questions-${range[0]}-${range[1]}`,
    range,
    pageNumber: 1,
    sourceText,
    questionType,
    instructionConstraints: {},
    evidence: [{ documentId: 'doc-1', pageNumber: 1, method: 'PDF_TEXT' }],
    questions: [],
  };
}

describe('parseStructuredQuestionGroup', () => {
  it('creates per-question MCQ prompts and options', () => {
    const parsed = parseStructuredQuestionGroup(
      group(
        [25, 27],
        'SINGLE_CHOICE',
        [
          'Questions 25-27 Choose the appropriate letters A, B, C or D.',
          '25. First prompt A. First A B. First B C. First C D. First D',
          '26. Second prompt A. Second A B. Second B C. Second C D. Second D',
          '27. Third prompt A. Third A B. Third B C. Third C D. Third D',
        ].join(' '),
      ),
    );

    expect(parsed.questions).toHaveLength(3);
    expect(parsed.questions[0]).toMatchObject({
      number: 25,
      questionType: 'SINGLE_CHOICE',
      prompt: 'First prompt',
      options: [
        { id: 'A', label: 'First A' },
        { id: 'B', label: 'First B' },
        { id: 'C', label: 'First C' },
        { id: 'D', label: 'First D' },
      ],
    });
    expect(parsed.reviewItems).toEqual([]);
  });

  it('shares a labelled people list across matching-feature questions', () => {
    const parsed = parseStructuredQuestionGroup(
      group(
        [37, 40],
        'MATCHING_FEATURES',
        [
          'Questions 37-40 Match each piece of information with the correct person A-E.',
          '37. Assisted with funding.',
          '38. An Italian explorer.',
          '39. Created a map.',
          '40. Conquered the peninsula.',
          'List of people A. Christopher Columbus B. Francisco Pizarro C. Ferdinand and Isabella D. Luis de Santangel E. Martin Waldseemuller',
        ].join(' '),
      ),
    );

    expect(parsed.questions).toHaveLength(4);
    expect(parsed.questions[0].options).toHaveLength(5);
    expect(parsed.questions[0].options?.[0]).toEqual({
      id: 'A',
      label: 'Christopher Columbus',
    });
    expect(parsed.reviewItems).toEqual([]);
  });

  it('creates diagram question numbers but requires review when source text has no individual labels', () => {
    const parsed = parseStructuredQuestionGroup(
      group(
        [1, 4],
        'DIAGRAM_LABEL_COMPLETION',
        'Questions 1-4 Label the diagram below with the names of the layers.',
      ),
    );

    expect(parsed.questions.map((question) => question.number)).toEqual([1, 2, 3, 4]);
    expect(parsed.questions.every((question) => question.questionType === 'DIAGRAM_LABEL_COMPLETION')).toBe(true);
    expect(parsed.reviewItems).toHaveLength(4);
    expect(parsed.reviewItems[0].reason).toContain('visual label');
  });
});
