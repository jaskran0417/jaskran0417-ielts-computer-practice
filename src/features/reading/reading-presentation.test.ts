import { describe, expect, it } from 'vitest';
import { readingGroupDisplayInstruction } from './reading-presentation';

describe('readingGroupDisplayInstruction', () => {
  it('keeps only the real instruction instead of question bodies and PDF footer text', () => {
    expect(
      readingGroupDisplayInstruction([
        'Questions 5-9 Complete each sentence with the correct ending A-I from the box below.',
        'Write the correct letter A-I in boxes 5-9.',
        '5. The vast majority of the total mass of the solar system is accounted for by ...',
        '6. There is no fixed outer edge ...',
        'After you’ve tried these questions, check your answers with the following video.',
      ].join('\n')),
    ).toBe([
      'Complete each sentence with the correct ending A-I from the box below.',
      'Write the correct letter A-I in boxes 5-9.',
    ].join('\n'));
  });

  it('removes a standalone range heading but preserves TFNG guidance lines', () => {
    expect(
      readingGroupDisplayInstruction([
        'Questions 10-14',
        'Do the following statements agree with the information?',
        'TRUE if the statement agrees',
        'FALSE if the statement contradicts',
        'NOT GIVEN if there is no information',
        '10. The surface of the sun is cool.',
      ].join('\n')),
    ).toContain('NOT GIVEN if there is no information');
  });
});
