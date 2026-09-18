import { describe, expect, it } from 'vitest';
import { parseInstructionConstraints } from './instruction-parser';

describe('parseInstructionConstraints', () => {
  it('extracts word limits and number allowance', () => {
    expect(
      parseInstructionConstraints('Choose NO MORE THAN TWO WORDS AND/OR A NUMBER'),
    ).toEqual({
      maxWords: 2,
      numbersAllowed: true,
    });

    expect(
      parseInstructionConstraints('Choose NO MORE THAN TWO WORDS'),
    ).toEqual({
      maxWords: 2,
      numbersAllowed: false,
    });
  });

  it('supports one-word and three-word limits', () => {
    expect(parseInstructionConstraints('Write ONE WORD ONLY')).toEqual({
      maxWords: 1,
      numbersAllowed: false,
    });

    expect(
      parseInstructionConstraints('NO MORE THAN THREE WORDS AND/OR A NUMBER'),
    ).toEqual({
      maxWords: 3,
      numbersAllowed: true,
    });
  });
});
