import { describe, expect, it } from 'vitest';
import type { ReadingQuestionDraft } from '../reading/types';
import type { ParsedAnswerEntry } from './types';
import { mapAnswersToQuestions } from './question-answer-mapper';

function question(number: number): ReadingQuestionDraft {
  return {
    id: `q-${number}`,
    number,
    type: 'SHORT_ANSWER',
    prompt: `Question ${number}`,
    instructionConstraints: { maxWords: 2, numbersAllowed: true },
    evidence: [],
  };
}

function answer(number: number, raw = `answer-${number}`): ParsedAnswerEntry {
  return {
    questionNumber: number,
    raw,
    constraints: { maxWords: 2, numbersAllowed: true },
    evidence: [
      {
        documentId: 'answer-key',
        pageNumber: 13,
        method: 'ANSWER_KEY_A',
      },
    ],
  };
}

describe('mapAnswersToQuestions', () => {
  it('maps a complete 1-40 key to immutable question ids', () => {
    const result = mapAnswersToQuestions({
      questions: Array.from({ length: 40 }, (_, index) => question(index + 1)),
      answerEntries: Array.from({ length: 40 }, (_, index) => answer(index + 1)),
    });

    expect(Object.keys(result.definitions)).toHaveLength(40);
    expect(result.definitions['q-17']?.questionNumber).toBe(17);
    expect(result.missingQuestionNumbers).toEqual([]);
    expect(result.duplicateQuestionNumbers).toEqual([]);
    expect(result.unmappedAnswerNumbers).toEqual([]);
    expect(result.blockingReasons).toEqual([]);
  });

  it('blocks when question 17 has no supplied answer', () => {
    const result = mapAnswersToQuestions({
      questions: Array.from({ length: 40 }, (_, index) => question(index + 1)),
      answerEntries: Array.from({ length: 40 }, (_, index) => answer(index + 1))
        .filter((entry) => entry.questionNumber !== 17),
    });

    expect(result.missingQuestionNumbers).toEqual([17]);
    expect(result.blockingReasons).toContain('Missing answers for questions: 17');
  });

  it('blocks duplicate answer numbers', () => {
    const result = mapAnswersToQuestions({
      questions: [question(25)],
      answerEntries: [answer(25, 'C'), answer(25, 'D')],
    });

    expect(result.duplicateQuestionNumbers).toEqual([25]);
    expect(result.blockingReasons).toContain('Duplicate answers for questions: 25');
  });

  it('blocks answers that do not map to an imported question', () => {
    const result = mapAnswersToQuestions({
      questions: [question(1)],
      answerEntries: [answer(1), answer(41)],
    });

    expect(result.unmappedAnswerNumbers).toEqual([41]);
    expect(result.blockingReasons).toContain('Answers do not map to questions: 41');
  });
});
