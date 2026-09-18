import { describe, expect, it } from 'vitest';
import { parseInstructionConstraints } from './instruction-parser';

describe('parseInstructionConstraints', () => {
  it('parses a maximum word count with numbers allowed', () => {
    expect(
      parseInstructionConstraints('Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage'),
    ).toEqual({
      maxWords: 2,
      numbersAllowed: true,
    });
  });

  it('parses a maximum word count without numbers', () => {
    expect(
      parseInstructionConstraints('Choose NO MORE THAN TWO WORDS from the reading passage'),
    ).toEqual({
      maxWords: 2,
      numbersAllowed: false,
    });
  });

  it('recognizes reusable matching options', () => {
    expect(
      parseInstructionConstraints('NB answers A-E can be used more than once.'),
    ).toMatchObject({
      optionReuse: 'MULTIPLE',
    });
  });
});
