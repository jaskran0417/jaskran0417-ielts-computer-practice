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
});
