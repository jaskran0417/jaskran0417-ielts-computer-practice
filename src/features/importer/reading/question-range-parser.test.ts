import { describe, expect, it } from 'vitest';
import { parseQuestionRanges } from './question-range-parser';
import type { ReadingSourcePage } from './reading-structure';

function page(pageNumber: number, text: string): ReadingSourcePage {
  return {
    documentId: 'doc-1',
    pageNumber,
    text,
    evidence: [{ documentId: 'doc-1', pageNumber, method: 'PDF_TEXT' }],
  };
}

describe('parseQuestionRanges', () => {
  it('finds all explicit question ranges including two groups on one page', () => {
    const ranges = parseQuestionRanges([
      page(3, 'Questions 1-4 Label the diagram below'),
      page(4, 'Questions 5-9 Complete each sentence ... Questions 10-14 Do the following statements'),
      page(6, 'Questions 15-19 Choose NO MORE THAN TWO WORDS'),
      page(7, 'Questions 20-24 Passage 2 has six sections'),
      page(8, 'Questions 25-27 Choose A, B, C or D'),
      page(11, 'Questions 28-31 Complete the table ... Questions 32-36 Which paragraphs contain'),
      page(12, 'Questions 37-40 Match each piece of information'),
    ]);

    expect(ranges.map((range) => [range.start, range.end])).toEqual([
      [1, 4],
      [5, 9],
      [10, 14],
      [15, 19],
      [20, 24],
      [25, 27],
      [28, 31],
      [32, 36],
      [37, 40],
    ]);
  });

  it('accepts en-dash question ranges', () => {
    expect(
      parseQuestionRanges([page(1, 'Questions 5–9 Complete each sentence')])[0],
    ).toMatchObject({ start: 5, end: 9 });
  });
});
