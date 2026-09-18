import { describe, expect, it } from 'vitest';
import type { ReadingQuestionDraft } from '../reading/types';
import type { ParsedAnswerEntry } from './types';
import { mapAnswersToQuestions } from './question-answer-mapper';

function question(
  number: number,
  type: ReadingQuestionDraft['type'] = 'SHORT_ANSWER',
): ReadingQuestionDraft {
  return {
    id: `q-${number}`,
    number,
    type,
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
  it('expands T F and NG only for True False Not Given questions', () => {
    const tfng = mapAnswersToQuestions({
      questions: [
        question(10, 'TRUE_FALSE_NOT_GIVEN'),
        question(11, 'TRUE_FALSE_NOT_GIVEN'),
        question(12, 'TRUE_FALSE_NOT_GIVEN'),
      ],
      answerEntries: [answer(10, 'F'), answer(11, 'T'), answer(12, 'NG')],
    });

    expect(tfng.definitions['q-10']?.canonical).toEqual(['false']);
    expect(tfng.definitions['q-11']?.canonical).toEqual(['true']);
    expect(tfng.definitions['q-12']?.canonical).toEqual(['not_given']);

    const matching = mapAnswersToQuestions({
      questions: [question(36, 'MATCHING_INFORMATION')],
      answerEntries: [answer(36, 'F')],
    });

    expect(matching.definitions['q-36']?.canonical).toEqual(['f']);
  });
});
