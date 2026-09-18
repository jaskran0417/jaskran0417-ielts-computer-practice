import { describe, expect, it } from 'vitest';
import { parseDocumentOutline } from './document-outline-parser';
import type { ReadingSourcePage } from './reading-structure';

function page(pageNumber: number, text: string): ReadingSourcePage {
  return {
    documentId: 'doc-1',
    pageNumber,
    text,
    evidence: [
      {
        documentId: 'doc-1',
        pageNumber,
        method: 'PDF_TEXT',
      },
    ],
  };
}

describe('parseDocumentOutline', () => {
  it('finds explicit Passage markers without relying on the document title', () => {
    const result = parseDocumentOutline([
      page(1, 'Practice header Passage 1 The Layers of the Sun Consider the earth...'),
      page(5, 'Practice header Passage 2 The Changing Landscape of Oceania Section A - ...'),
      page(9, 'Practice header Passage 3 Spanish Exploration and Conquest A - ...'),
    ]);

    expect(result.passages.map((passage) => ({
      ordinal: passage.ordinal,
      pageNumber: passage.pageNumber,
    }))).toEqual([
      { ordinal: 1, pageNumber: 1 },
      { ordinal: 2, pageNumber: 5 },
      { ordinal: 3, pageNumber: 9 },
    ]);
    expect(result.reviewItems).toEqual([]);
  });

  it('surfaces duplicate passage numbers for review', () => {
    const result = parseDocumentOutline([
      page(1, 'Passage 1 First'),
      page(2, 'Passage 1 Duplicate'),
    ]);

    expect(result.reviewItems).toEqual([
      expect.objectContaining({
        critical: true,
        reason: 'Passage 1 appears more than once',
      }),
    ]);
  });
});
