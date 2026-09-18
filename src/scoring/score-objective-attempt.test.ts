import { describe, expect, it } from 'vitest';
import type { AnswerDefinitionDraft } from '../features/importer/answers/types';
import { scoreObjectiveAttempt } from './score-objective-attempt';

function definition(
  questionNumber: number,
  canonical: string,
  alternatives: string[] = [],
  maxWords?: number,
): AnswerDefinitionDraft {
  return {
    questionNumber,
    canonical: [canonical],
    alternatives: alternatives.map((value) => [value]),
    normalization: {
      caseSensitive: false,
      collapseWhitespace: true,
      punctuation: 'IGNORE_TERMINAL',
      maxWords,
      numbersAllowed: true,
      orderSensitive: true,
    },
    sourceEvidence: [],
    verificationState: 'VERIFIED',
  };
}

describe('objective scoring', () => {
  it('accepts only explicitly defined normalized answers', () => {
    const score = scoreObjectiveAttempt({
      responses: {
        q1: 'The Corona',
        q2: '6 years',
        q3: 'almost six years',
      },
      definitions: {
        q1: definition(1, 'corona', ['the corona'], 2),
        q2: definition(2, 'six years', ['6 years'], 2),
        q3: definition(3, 'six years', ['6 years'], 2),
      },
    });

    expect(score.rawScore).toBe(2);
    expect(score.totalQuestions).toBe(3);
    expect(score.outcomes).toEqual([
      { questionId: 'q1', correct: true },
      { questionId: 'q2', correct: true },
      { questionId: 'q3', correct: false, ruleViolation: 'MAX_WORDS' },
    ]);
  });

  it('does not accept a semantic near-match that was not listed', () => {
    const score = scoreObjectiveAttempt({
      responses: { q1: 'solar atmosphere' },
      definitions: { q1: definition(1, 'corona') },
    });

    expect(score.rawScore).toBe(0);
    expect(score.outcomes[0]).toEqual({ questionId: 'q1', correct: false });
  });

  it('scores missing responses as incorrect', () => {
    const score = scoreObjectiveAttempt({
      responses: {},
      definitions: {
        q1: definition(1, 'TRUE'),
        q2: definition(2, 'FALSE'),
      },
    });

    expect(score.rawScore).toBe(0);
    expect(score.totalQuestions).toBe(2);
  });
});
