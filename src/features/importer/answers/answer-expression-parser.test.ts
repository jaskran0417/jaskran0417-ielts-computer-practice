import { describe, expect, it } from 'vitest';
import { parseAnswerExpression } from './answer-expression-parser';

const evidence = [
  {
    documentId: 'answer-key',
    pageNumber: 13,
    method: 'ANSWER_KEY_A' as const,
  },
];

function accepted(raw: string): string[] {
  const result = parseAnswerExpression({
    questionNumber: 1,
    raw,
    constraints: { maxWords: 2, numbersAllowed: true },
    evidence,
  });

  return [...result.canonical, ...result.alternatives.flat()].sort();
}

describe('parseAnswerExpression', () => {
  it('expands an optional leading article conservatively', () => {
    expect(accepted('(The) corona')).toEqual(['corona', 'the corona']);
  });

  it('expands an optional adjective conservatively', () => {
    expect(accepted('(strict) quarantine')).toEqual([
      'quarantine',
      'strict quarantine',
    ]);
  });

  it('expands an optional prefix and a simple slash alternative', () => {
    expect(accepted('(around) six/6 years')).toEqual([
      '6 years',
      'around 6 years',
      'around six years',
      'six years',
    ]);
  });

  it('requires review for ambiguous chained slash notation', () => {
    const result = parseAnswerExpression({
      questionNumber: 18,
      raw: 'ninety/90 percent/per cent/%',
      constraints: { maxWords: 2, numbersAllowed: true },
      evidence,
    });

    expect(result.verificationState).toBe('REVIEW_REQUIRED');
    expect(result.canonical).toEqual(['ninety/90 percent/per cent/%']);
  });
  it('expands a spaced whole-answer alternative without applying the optional article to both choices', () => {
    expect(accepted('(the) queen / Isabella')).toEqual([
      'isabella',
      'queen',
      'the queen',
    ]);
  });

  it('expands the percentage alternatives used by the real Reading answer key', () => {
    expect(accepted('ninety/90 percent/per cent/%')).toEqual([
      '90 per cent',
      '90 percent',
      '90%',
      'ninety per cent',
      'ninety percent',
    ]);
  });

});
