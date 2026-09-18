import { describe, expect, it } from 'vitest';
import type { AnswerCoverageResult } from '../answers/question-answer-mapper';
import type { SemanticReviewItem } from '../review/semantic-review';
import type {
  StructuredReadingDraft,
  VisualAnchorDraft,
} from '../reading/types';
import { prepareReadingPublication } from './import-publication';

function structuredDraft(): StructuredReadingDraft {
  return {
    title: 'Imported Reading',
    reviewItems: [],
    sections: [
      {
        id: 'section-1',
        passageNumber: 1,
        title: 'A Test Passage',
        pageNumbers: [1, 2],
        passageText: ['The passage text.'],
        evidence: [],
        questionGroups: [
          {
            id: 'group-1-1',
            startQuestion: 1,
            endQuestion: 1,
            type: 'SINGLE_CHOICE',
            instructionText: 'Choose the correct answer.',
            instructionConstraints: {},
            evidence: [],
            questions: [
              {
                id: 'q-1',
                number: 1,
                type: 'SINGLE_CHOICE',
                prompt: 'Which option is correct?',
                instructionConstraints: {},
                evidence: [],
                options: [
                  { id: 'A', label: 'Alpha' },
                  { id: 'B', label: 'Bravo' },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function answers(): AnswerCoverageResult {
  return {
    definitions: {
      'q-1': {
        questionNumber: 1,
        canonical: ['A'],
        alternatives: [],
        normalization: {
          caseSensitive: false,
          collapseWhitespace: true,
          punctuation: 'STRICT',
        },
        sourceEvidence: [],
        verificationState: 'VERIFIED',
      },
    },
    missingQuestionNumbers: [],
    duplicateQuestionNumbers: [],
    unmappedAnswerNumbers: [],
    blockingReasons: [],
  };
}

function verifiedReview(): SemanticReviewItem[] {
  return [
    {
      id: 'question-1-text',
      kind: 'QUESTION_TEXT',
      label: 'Question 1 text',
      critical: true,
      value: 'Which option is correct?',
      evidence: [],
      state: 'VERIFIED',
      questionNumber: 1,
    },
    {
      id: 'answer-q-1',
      kind: 'ANSWER_DEFINITION',
      label: 'Question 1 accepted answer',
      critical: true,
      value: 'A',
      evidence: [],
      state: 'VERIFIED',
      questionNumber: 1,
    },
  ];
}

describe('prepareReadingPublication', () => {
  it('creates a runnable student package while keeping protected answers separate', () => {
    const result = prepareReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      structuredDraft: structuredDraft(),
      answerCoverage: answers(),
      reviewItems: verifiedReview(),
      visualAnchors: [],
      visualAssets: {},
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a publishable Reading package');

    expect(result.value.studentPackage).toMatchObject({
      id: 'test-1',
      versionId: 'version-1',
      title: 'Imported Reading',
      durationSeconds: 3600,
      modules: [
        {
          kind: 'READING',
          sections: [
            {
              passage: {
                title: 'A Test Passage',
                paragraphs: ['The passage text.'],
              },
              questionGroups: [
                {
                  questions: [
                    {
                      id: 'q-1',
                      number: 1,
                      type: 'SINGLE_CHOICE',
                      options: [
                        { id: 'A', label: 'Alpha' },
                        { id: 'B', label: 'Bravo' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.value.protectedAnswers['q-1']?.canonical).toEqual(['A']);
    const studentJson = JSON.stringify(result.value.studentPackage);
    expect(studentJson).not.toContain('canonical');
    expect(studentJson).not.toContain('protectedAnswers');
    expect(studentJson).not.toContain('correctAnswer');
  });

  it('publishes unscored Reading without an answer key and exposes no protected answers', () => {
    const missingAnswers: AnswerCoverageResult = {
      definitions: {},
      missingQuestionNumbers: [1],
      duplicateQuestionNumbers: [],
      unmappedAnswerNumbers: [],
      blockingReasons: ['Missing answers for questions: 1'],
    };
    const reviewItems = verifiedReview().filter(
      (item) => item.kind !== 'ANSWER_DEFINITION',
    );

    const result = prepareReadingPublication({
      testId: 'test-unscored',
      versionId: 'version-unscored',
      structuredDraft: structuredDraft(),
      answerCoverage: missingAnswers,
      reviewItems,
      visualAnchors: [],
      visualAssets: {},
      scoringMode: 'UNSCORED',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected unscored Reading to publish');

    expect(result.value.studentPackage.modules[0]).toMatchObject({
      kind: 'READING',
      scoringMode: 'UNSCORED',
    });
    expect(result.value.protectedAnswers).toEqual({});
  });

  it('blocks publication while a critical semantic item still requires review', () => {
    const reviewItems = verifiedReview();
    reviewItems[0] = {
      ...reviewItems[0]!,
      state: 'REVIEW_REQUIRED',
      value: null,
      message: 'Question text requires confirmation',
    };

    const result = prepareReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      structuredDraft: structuredDraft(),
      answerCoverage: answers(),
      reviewItems,
      visualAnchors: [],
      visualAssets: {},
    });

    expect(result).toEqual({
      ok: false,
      reasons: ['Critical semantic review items are unresolved'],
      blockingIds: ['question-1-text'],
    });
  });

  it('blocks a visual question until its anchor and student asset are available', () => {
    const draft = structuredDraft();
    draft.sections[0]!.questionGroups[0]!.type = 'DIAGRAM_LABEL_COMPLETION';
    draft.sections[0]!.questionGroups[0]!.questions[0] = {
      id: 'q-1',
      number: 1,
      type: 'DIAGRAM_LABEL_COMPLETION',
      prompt: 'Label the outer layer.',
      instructionConstraints: { maxWords: 2 },
      evidence: [],
      visualRegionId: 'diagram-1',
    };

    const pendingAnchor: VisualAnchorDraft = {
      questionNumber: 1,
      visualRegionId: 'diagram-1',
      anchor: null,
      verificationState: 'REVIEW_REQUIRED',
    };

    const result = prepareReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      structuredDraft: draft,
      answerCoverage: answers(),
      reviewItems: verifiedReview(),
      visualAnchors: [pendingAnchor],
      visualAssets: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected visual publication to be blocked');
    expect(result.reasons).toContain('Visual questions are not ready for publication');
  });
});
