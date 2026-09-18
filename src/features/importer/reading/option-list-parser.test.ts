import { describe, expect, it } from 'vitest';
import {
  parseSharedReadingOptions,
  parseSingleChoiceOptions,
} from './option-list-parser';

describe('Reading option-list parsing', () => {
  it('finds matching sentence endings even when the A-I list appears later on the same page', () => {
    const pageText = [
      'Questions 5-9',
      'Complete each sentence with the correct ending A-I below.',
      '5. Stem five',
      '9. Stem nine',
      'Questions 10-14',
      'TRUE FALSE NOT GIVEN',
      '10. Statement ten',
      '14. Statement fourteen',
      'A. Ending alpha',
      'B. Ending bravo',
      'C. Ending charlie',
      'D. Ending delta',
      'E. Ending echo',
      'F. Ending foxtrot',
      'G. Ending golf',
      'H. Ending hotel',
      'I. Ending india',
    ].join('\n');

    expect(
      parseSharedReadingOptions({
        type: 'MATCHING_SENTENCE_ENDINGS',
        instructionText: 'Complete each sentence with the correct ending A-I below.',
        pageText,
      }),
    ).toEqual([
      { id: 'A', label: 'Ending alpha' },
      { id: 'B', label: 'Ending bravo' },
      { id: 'C', label: 'Ending charlie' },
      { id: 'D', label: 'Ending delta' },
      { id: 'E', label: 'Ending echo' },
      { id: 'F', label: 'Ending foxtrot' },
      { id: 'G', label: 'Ending golf' },
      { id: 'H', label: 'Ending hotel' },
      { id: 'I', label: 'Ending india' },
    ]);
  });

  it('parses roman-numeral heading options', () => {
    const options = parseSharedReadingOptions({
      type: 'MATCHING_HEADINGS',
      instructionText: 'Choose the correct headings for Sections B-F.',
      pageText: [
        'List of Headings',
        'i. First heading',
        'ii. Second heading',
        'iii. Third heading',
        'iv. Fourth heading',
      ].join('\n'),
    });

    expect(options).toEqual([
      { id: 'i', label: 'First heading' },
      { id: 'ii', label: 'Second heading' },
      { id: 'iii', label: 'Third heading' },
      { id: 'iv', label: 'Fourth heading' },
    ]);
  });

  it('parses heading labels without punctuation exactly as extracted from the Reading fixture', () => {
    const options = parseSharedReadingOptions({
      type: 'MATCHING_HEADINGS',
      instructionText: 'Choose the correct heading for each section from the list of headings below.',
      pageText: [
        'Questions 20-24',
        'Choose the correct heading for each section from the list of headings below.',
        '20 Section A',
        '21 Section B',
        '22 Section C',
        '23 Section D',
        '24 Section E',
        'List of Headings',
        'i Heading one',
        'ii Heading two',
        'iii Heading three',
      ].join('\n'),
    });

    expect(options).toEqual([
      { id: 'i', label: 'Heading one' },
      { id: 'ii', label: 'Heading two' },
      { id: 'iii', label: 'Heading three' },
    ]);
  });

  it('parses a labelled people/features list', () => {
    const options = parseSharedReadingOptions({
      type: 'MATCHING_FEATURES',
      instructionText: 'Match each statement with the correct person A-E.',
      pageText: [
        'List of people',
        'A. Person Alpha',
        'B. Person Bravo',
        'C. Person Charlie',
        'D. Person Delta',
        'E. Person Echo',
      ].join('\n'),
    });

    expect(options).toHaveLength(5);
    expect(options[4]).toEqual({ id: 'E', label: 'Person Echo' });
  });

  it('derives paragraph labels only from an explicit paragraph range', () => {
    expect(
      parseSharedReadingOptions({
        type: 'MATCHING_INFORMATION',
        instructionText: 'Passage 3 has six paragraphs labelled A-F. Which paragraphs contain the following information?',
        pageText: '',
      }),
    ).toEqual([
      { id: 'A', label: 'Paragraph A' },
      { id: 'B', label: 'Paragraph B' },
      { id: 'C', label: 'Paragraph C' },
      { id: 'D', label: 'Paragraph D' },
      { id: 'E', label: 'Paragraph E' },
      { id: 'F', label: 'Paragraph F' },
    ]);
  });

  it('parses separate A-D choices for each MCQ and keeps wrapped text with its option', () => {
    const result = parseSingleChoiceOptions({
      startQuestion: 25,
      endQuestion: 26,
      pageText: [
        '25. First question?',
        'A. First answer line one',
        'continues here.',
        'B. Second answer',
        'C. Third answer',
        'D. Fourth answer',
        '26. Second question?',
        'A. Alpha',
        'B. Bravo',
        'C. Charlie',
        'D. Delta',
      ].join('\n'),
    });

    expect(result[25]).toEqual([
      { id: 'A', label: 'First answer line one continues here.' },
      { id: 'B', label: 'Second answer' },
      { id: 'C', label: 'Third answer' },
      { id: 'D', label: 'Fourth answer' },
    ]);
    expect(result[26]).toEqual([
      { id: 'A', label: 'Alpha' },
      { id: 'B', label: 'Bravo' },
      { id: 'C', label: 'Charlie' },
      { id: 'D', label: 'Delta' },
    ]);
  });
});
