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
    expect(result.verification.map((item) => item.result.state)).toEqual([
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
  it('strips explanatory Extra info notes instead of parsing paragraph numbers as answers', () => {
    const result = parseAnswerKey([
      'Answers',
      '10. F Extra info- para 2: almost entirely, not entirely',
      '11. T Extra info- para 5',
      '12. NG Extra info- para 6',
      '13. NG Extra info- para 7 + 4',
      '14. T Extra info- para 9',
      '15. water pollution Extra info- para 1',
    ].join('\n'));

    expect(result.answers).toEqual([
      { questionNumber: 10, answer: 'F' },
      { questionNumber: 11, answer: 'T' },
      { questionNumber: 12, answer: 'NG' },
      { questionNumber: 13, answer: 'NG' },
      { questionNumber: 14, answer: 'T' },
      { questionNumber: 15, answer: 'water pollution' },
    ]);
    expect(result.verification.map((item) => item.questionNumber)).toEqual([
      10, 11, 12, 13, 14, 15,
    ]);
  });
  it('does not mistake a number inside an answer for the next question number', () => {
    const result = parseAnswerKey([
      '28. entry 28',
      '29. (the) Bahamas',
      '30. (the) queen / Isabella',
      '31. entry 31',
      '32. A',
    ].join('\n'));

    expect(result.answers).toEqual([
      { questionNumber: 28, answer: 'entry 28' },
      { questionNumber: 29, answer: '(the) Bahamas' },
      { questionNumber: 30, answer: '(the) queen / Isabella' },
      { questionNumber: 31, answer: 'entry 31' },
      { questionNumber: 32, answer: 'A' },
    ]);
  });

  it('keeps the final numbered answer separate from the supplied PDF footer', () => {
    const result = parseAnswerKey([
      'Answers',
      '37. D',
      '38. A',
      '39. E',
      '40. C',
      'Note: This is not a real IELTS test. This practice test is for strategy practice.',
    ].join('\n'));

    expect(result.answers).toEqual([
      { questionNumber: 37, answer: 'D' },
      { questionNumber: 38, answer: 'A' },
      { questionNumber: 39, answer: 'E' },
      { questionNumber: 40, answer: 'C' },
    ]);
    expect(result.verification.map((item) => item.result.state)).toEqual([
      'VERIFIED',
      'VERIFIED',
      'VERIFIED',
      'VERIFIED',
    ]);
  });


});
