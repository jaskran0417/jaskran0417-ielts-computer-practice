import { describe, expect, it } from 'vitest';
import type { PassageHighlight } from '../../exam-engine/types';
import { normalizePassageRange, segmentsForParagraph } from './passage-annotations';

function highlight(
  id: string,
  startOffset: number,
  endOffset: number,
): PassageHighlight {
  return {
    id,
    passageId: 'passage-1',
    paragraphIndex: 0,
    startOffset,
    endOffset,
    text: 'fixture',
  };
}

describe('passage annotations', () => {
  it('clamps a range to paragraph bounds and rejects empty ranges', () => {
    expect(normalizePassageRange({ startOffset: -5, endOffset: 20 }, 10)).toEqual({
      startOffset: 0,
      endOffset: 10,
    });
    expect(normalizePassageRange({ startOffset: 5, endOffset: 5 }, 10)).toBeNull();
  });

  it('returns one plain segment when there are no highlights', () => {
    expect(segmentsForParagraph('abcdef', [])).toEqual([
      { text: 'abcdef', highlighted: false, highlightIds: [] },
    ]);
  });

  it('splits one highlight into plain and highlighted segments', () => {
    expect(segmentsForParagraph('abcdef', [highlight('h1', 1, 4)])).toEqual([
      { text: 'a', highlighted: false, highlightIds: [] },
      { text: 'bcd', highlighted: true, highlightIds: ['h1'] },
      { text: 'ef', highlighted: false, highlightIds: [] },
    ]);
  });

  it('renders overlapping ranges deterministically without duplicating text', () => {
    expect(
      segmentsForParagraph('abcdefgh', [
        highlight('h1', 1, 5),
        highlight('h2', 3, 7),
      ]),
    ).toEqual([
      { text: 'a', highlighted: false, highlightIds: [] },
      { text: 'bc', highlighted: true, highlightIds: ['h1'] },
      { text: 'de', highlighted: true, highlightIds: ['h1', 'h2'] },
      { text: 'fg', highlighted: true, highlightIds: ['h2'] },
      { text: 'h', highlighted: false, highlightIds: [] },
    ]);
  });
});
