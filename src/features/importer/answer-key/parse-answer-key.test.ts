import { describe, expect, it } from 'vitest';
import { parseAnswerKey } from './parse-answer-key';

describe('parseAnswerKey', () => {
  it('verifies a normal line-oriented answer key with two independent parsers', () => {
    const result = parseAnswerKey(`
1. library
2 B
3 TRUE
`);

    expect(result.answers).toEqual([
      { questionNumber: 1, answer: 'library' },
      { questionNumber: 2, answer: 'B' },
      { questionNumber: 3, answer: 'TRUE' },
    ]);
    expect(result.verification.map((item) => item.state)).toEqual([
      'VERIFIED',
      'VERIFIED',
      'VERIFIED',
    ]);
  });

  it('supports compact answer keys separated by repeated whitespace', () => {
    const result = parseAnswerKey('1 library  2 B  3 TRUE');

    expect(result.answers).toEqual([
      { questionNumber: 1, answer: 'library' },
      { questionNumber: 2, answer: 'B' },
      { questionNumber: 3, answer: 'TRUE' },
    ]);
  });

  it('does not silently choose an answer when independent parsers disagree', () => {
    const result = parseAnswerKey('1 library\n2 B', {
      parserB: () => [
        { questionNumber: 1, answer: 'libraries' },
        { questionNumber: 2, answer: 'B' },
      ],
    });

    expect(result.answers).toEqual([{ questionNumber: 2, answer: 'B' }]);
    expect(result.verification[0].questionNumber).toBe(1);
    expect(result.verification[0].result.state).toBe('REVIEW_REQUIRED');
    expect(result.verification[0].result.normalizedValue).toBeNull();
  });

  it('flags an answer missing from one parser for review', () => {
    const result = parseAnswerKey('1 library\n2 B', {
      parserB: () => [{ questionNumber: 1, answer: 'library' }],
    });

    const question2 = result.verification.find((item) => item.questionNumber === 2);
    expect(question2?.result.state).toBe('REVIEW_REQUIRED');
    expect(result.answers.some((answer) => answer.questionNumber === 2)).toBe(false);
  });
});
