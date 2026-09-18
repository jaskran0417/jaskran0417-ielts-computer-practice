import { describe, expect, it } from 'vitest';
import fixture from '../../../../tests/fixtures/reading-import/fixture.json';
import type { ReadingSourceBlock } from './types';
import { parseReadingDocumentOutline } from './document-outline';

function blocks(): ReadingSourceBlock[] {
  return fixture.blocks.map((block) => ({
    ...block,
    evidence: [
      {
        documentId: 'reading-pdf',
        pageNumber: block.pageNumber,
        method: 'PDF_TEXT' as const,
      },
    ],
  }));
}

describe('parseReadingDocumentOutline', () => {
  it('finds three passages and all Reading question ranges', () => {
    const outline = parseReadingDocumentOutline(blocks());

    expect(outline.passages.map((passage) => ({
      number: passage.passageNumber,
      title: passage.title,
    }))).toEqual([
      { number: 1, title: 'The Layers of the Sun' },
      { number: 2, title: 'The Changing Landscape of Oceania' },
      { number: 3, title: 'Spanish Exploration and Conquest' },
    ]);

    expect(
      outline.questionRanges.map((range) => [range.start, range.end]),
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
    expect(outline.issues).toEqual([]);
  });

  it('reports overlapping question ranges instead of silently accepting them', () => {
    const outline = parseReadingDocumentOutline([
      {
        pageNumber: 1,
        text: 'Passage 1\nSample passage',
        evidence: [],
      },
      {
        pageNumber: 2,
        text: 'Questions 1-4\nFirst group',
        evidence: [],
      },
      {
        pageNumber: 2,
        text: 'Questions 4-8\nOverlapping group',
        evidence: [],
      },
    ]);

    expect(outline.issues).toContain('Question ranges overlap: 1-4 and 4-8');
  });
  it('splits multiple question ranges on the same PDF page into independent blocks', () => {
    const outline = parseReadingDocumentOutline([
      {
        pageNumber: 4,
        text: [
          'Questions 5-9',
          'Complete each sentence with the correct ending A-I.',
          '5. First ending question',
          '9. Last ending question',
          'Questions 10-14',
          'Do the following statements agree with the information?',
          'True',
          'False',
          'Not Given',
          '10. First TFNG statement',
          '14. Last TFNG statement',
        ].join('\n'),
        evidence: [],
      },
    ]);

    expect(outline.questionRanges).toHaveLength(2);
    expect(outline.questionRanges[0]?.instructionText).toContain('correct ending A-I');
    expect(outline.questionRanges[0]?.instructionText).not.toContain('True\nFalse\nNot Given');
    expect(outline.questionRanges[1]?.instructionText).toContain('True\nFalse\nNot Given');
    expect(outline.questionRanges[1]?.instructionText).not.toContain('correct ending A-I');
  });

  it('does not treat an instruction sentence that starts with Passage 3 as a passage heading', () => {
    const outline = parseReadingDocumentOutline([
      {
        pageNumber: 9,
        text: ['Passage 3', 'Spanish Exploration and Conquest', 'Passage text'].join('\n'),
        evidence: [],
      },
      {
        pageNumber: 11,
        text: [
          'Questions 32-36',
          'Passage 3 has six paragraphs labelled A-F.',
          'Which paragraphs contain the following information?',
        ].join('\n'),
        evidence: [],
      },
    ]);

    expect(outline.passages).toHaveLength(1);
    expect(outline.passages[0]).toMatchObject({
      passageNumber: 3,
      title: 'Spanish Exploration and Conquest',
      pageNumbers: [9],
    });
  });
});
