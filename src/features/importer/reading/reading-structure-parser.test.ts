import { describe, expect, it } from 'vitest';
import { parseReadingStructure } from './reading-structure-parser';
import type { ReadingSourcePage } from './reading-structure';

function page(pageNumber: number, text: string): ReadingSourcePage {
  return {
    documentId: 'doc-1',
    pageNumber,
    text,
    evidence: [{ documentId: 'doc-1', pageNumber, method: 'PDF_TEXT' }],
  };
}

describe('parseReadingStructure', () => {
  it('groups the supplied-fixture pattern into three passages and question ranges 1-40', () => {
    const result = parseReadingStructure([
      page(1, 'Passage 1 The Layers of the Sun Consider the earth and moon.'),
      page(2, 'The chromosphere is the zone ... To conclude ...'),
      page(3, 'Questions 1-4 Label the diagram below.'),
      page(4, 'Questions 5-9 Complete each sentence. Questions 10-14 Do the following statements.'),
      page(5, 'Passage 2 The Changing Landscape of Oceania Section A - Human settlement...'),
      page(6, 'Section F - climate change... Questions 15-19 Choose NO MORE THAN TWO WORDS.'),
      page(7, 'Questions 20-24 Passage 2 has six sections labelled A-F.'),
      page(8, 'Questions 25-27 Choose the appropriate letters A, B, C or D.'),
      page(9, 'Passage 3 Spanish Exploration and Conquest A - The Spanish established...'),
      page(10, 'E - Columbus letter... F - In 1493...'),
      page(11, 'Questions 28-31 Complete the table. Questions 32-36 Which paragraphs contain...'),
      page(12, 'Questions 37-40 Match each piece of information.'),
    ]);

    expect(result.sections.map((section) => section.ordinal)).toEqual([1, 2, 3]);
    expect(
      result.sections.flatMap((section) =>
        section.questionGroups.map((group) => group.range),
      ),
    ).toEqual([
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
    expect(result.reviewItems).toEqual([]);
  });

  it('creates a critical review item when question numbering has a gap', () => {
    const result = parseReadingStructure([
      page(1, 'Passage 1 Text'),
      page(2, 'Questions 1-4 First group Questions 6-10 Second group'),
    ]);

    expect(result.reviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          critical: true,
          reason: 'Question numbering gap between 4 and 6',
        }),
      ]),
    );
  });

  it('keeps passage text before the first Questions marker on a mixed page', () => {
    const result = parseReadingStructure([
      page(1, 'Passage 1 Intro paragraph.'),
      page(2, 'Final passage paragraph. Questions 1-4 Label the diagram.'),
    ]);

    expect(result.sections[0].passageText.join(' ')).toContain('Final passage paragraph.');
    expect(result.sections[0].passageText.join(' ')).not.toContain('Label the diagram');
  });
});
