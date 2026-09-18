import { describe, expect, it } from 'vitest';
import type { StudentQuestion } from '../../../test-schema/types';
import { mapAnswerDefinitions } from './map-answer-definitions';

function questions(count = 40): StudentQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `q${index + 1}`,
    number: index + 1,
    type: 'SHORT_ANSWER' as const,
    prompt: `Question ${index + 1}`,
    constraints: { maxWords: 2, numbersAllowed: true },
  }));
}

function entries(count = 40) {
  return Array.from({ length: count }, (_, index) => ({
    questionNumber: index + 1,
    raw: `answer ${index + 1}`,
    evidence: [{
      documentId: 'answer-key',
      pageNumber: 13,
      method: 'ANSWER_KEY_A' as const,
    }],
    verificationState: 'VERIFIED' as const,
  }));
}

describe('mapAnswerDefinitions', () => {
  it('maps all supplied answers 1-40 by question number', () => {
    const mapped = mapAnswerDefinitions(questions(), entries());

    expect(Object.keys(mapped.definitions)).toHaveLength(40);
    expect(mapped.unmappedQuestionNumbers).toEqual([]);
    expect(mapped.duplicateQuestionNumbers).toEqual([]);
    expect(mapped.unusedAnswerNumbers).toEqual([]);
    expect(mapped.publicationReady).toBe(true);
  });

  it('blocks publication when one answer is missing', () => {
    const mapped = mapAnswerDefinitions(questions(), entries(39));

    expect(mapped.publicationReady).toBe(false);
    expect(mapped.unmappedQuestionNumbers).toEqual([40]);
  });

  it('blocks duplicate supplied answers for the same question', () => {
    const answerEntries = entries();
    answerEntries.push({ ...answerEntries[24], raw: 'different answer' });

    const mapped = mapAnswerDefinitions(questions(), answerEntries);

    expect(mapped.publicationReady).toBe(false);
    expect(mapped.duplicateQuestionNumbers).toEqual([25]);
  });

  it('reports answer numbers that do not exist in the question set', () => {
    const answerEntries = entries();
    answerEntries.push({
      questionNumber: 41,
      raw: 'extra',
      evidence: [{ documentId: 'answer-key', pageNumber: 13, method: 'ANSWER_KEY_A' as const }],
      verificationState: 'VERIFIED' as const,
    });

    const mapped = mapAnswerDefinitions(questions(), answerEntries);

    expect(mapped.publicationReady).toBe(false);
    expect(mapped.unusedAnswerNumbers).toEqual([41]);
  });

  it('maps TFNG abbreviations to protected enum values', () => {
    const mapped = mapAnswerDefinitions(
      [{ id: 'q10', number: 10, type: 'TRUE_FALSE_NOT_GIVEN', prompt: 'Statement' }],
      [{
        questionNumber: 10,
        raw: 'F',
        evidence: [{ documentId: 'answer-key', pageNumber: 13, method: 'ANSWER_KEY_A' }],
        verificationState: 'VERIFIED',
      }],
    );

    expect(mapped.definitions.q10).toMatchObject({
      kind: 'ENUM',
      accepted: ['FALSE'],
    });
  });
});
