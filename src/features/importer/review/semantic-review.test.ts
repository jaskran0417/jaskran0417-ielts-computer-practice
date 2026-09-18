import { describe, expect, it } from 'vitest';
import type { AnswerCoverageResult } from '../answers/question-answer-mapper';
import type { StructuredReadingDraft } from '../reading/types';
import { buildSemanticReviewQueue } from './semantic-review';

const evidence = [
  {
    documentId: 'reading-pdf',
    pageNumber: 3,
    method: 'PDF_TEXT' as const,
  },
];

function structuredDraft(): StructuredReadingDraft {
  return {
    title: 'Imported Reading Test',
    sections: [
      {
        id: 'section-1',
        passageNumber: 1,
        title: 'The Layers of the Sun',
        pageNumbers: [1, 2, 3, 4],
        passageText: ['Passage text'],
        evidence,
        questionGroups: [
          {
            id: 'group-1-1',
            startQuestion: 1,
            endQuestion: 1,
            type: 'SHORT_ANSWER',
            instructionText: 'Choose NO MORE THAN TWO WORDS.',
            instructionConstraints: { maxWords: 2, numbersAllowed: false },
            evidence,
            questions: [
              {
                id: 'q-1',
                number: 1,
                type: 'SHORT_ANSWER',
                prompt: 'Name the outer layer.',
                instructionConstraints: { maxWords: 2, numbersAllowed: false },
                evidence,
              },
            ],
          },
        ],
      },
    ],
    reviewItems: [],
  };
}

function answers(): AnswerCoverageResult {
  return {
    definitions: {
      'q-1': {
        questionNumber: 1,
        canonical: ['corona'],
        alternatives: [['the corona']],
        normalization: {
          caseSensitive: false,
          collapseWhitespace: true,
          punctuation: 'IGNORE_TERMINAL',
          maxWords: 2,
          numbersAllowed: false,
          orderSensitive: true,
        },
        sourceEvidence: [
          {
            documentId: 'answer-key',
            pageNumber: 13,
            method: 'ANSWER_KEY_A',
          },
        ],
        verificationState: 'VERIFIED',
      },
    },
    missingQuestionNumbers: [],
    duplicateQuestionNumbers: [],
    unmappedAnswerNumbers: [],
    blockingReasons: [],
  };
}

describe('buildSemanticReviewQueue', () => {
  it('builds reviewable semantic items instead of page-sized extraction blobs', () => {
    const queue = buildSemanticReviewQueue({
      structuredDraft: structuredDraft(),
      answers: answers(),
    });

    expect(queue.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        'Passage 1 title',
        'Questions 1–1 instruction',
        'Question 1 text',
        'Question 1 type',
        'Question 1 accepted answer',
      ]),
    );
    expect(queue.find((item) => item.label === 'Question 1 accepted answer')).toMatchObject({
      kind: 'ANSWER_DEFINITION',
      state: 'VERIFIED',
      value: 'corona | the corona',
    });
  });

  it('surfaces incomplete document structure as a blocking review item', () => {
    const draft: StructuredReadingDraft = {
      title: 'Imported Reading Test',
      sections: [],
      reviewItems: [
        {
          id: 'document-structure-no-passages',
          kind: 'DOCUMENT_STRUCTURE',
          message: 'No complete Reading passage structure could be created',
          evidence,
        },
      ],
    };

    const queue = buildSemanticReviewQueue({
      structuredDraft: draft,
      answers: {
        definitions: {},
        missingQuestionNumbers: [],
        duplicateQuestionNumbers: [],
        unmappedAnswerNumbers: [],
        blockingReasons: [],
      },
    });

    expect(queue).toContainEqual(
      expect.objectContaining({
        kind: 'DOCUMENT_STRUCTURE',
        label: 'Document structure',
        state: 'REVIEW_REQUIRED',
        critical: true,
      }),
    );
  });

  it('labels an option-list blocker as options rather than question text', () => {
    const draft = structuredDraft();
    draft.reviewItems.push({
      id: 'option-list-1',
      kind: 'OPTION_LIST',
      questionNumber: 1,
      message: 'Question 1 options could not be extracted reliably',
      evidence,
    });

    const queue = buildSemanticReviewQueue({
      structuredDraft: draft,
      answers: answers(),
    });

    expect(queue).toContainEqual(
      expect.objectContaining({
        kind: 'OPTION_LIST',
        questionNumber: 1,
        label: 'Question 1 options',
        state: 'REVIEW_REQUIRED',
      }),
    );
  });

});
