import { describe, expect, it } from 'vitest';
import { parsePageRanges } from './page-ranges';

describe('parsePageRanges', () => {
  it('parses single pages, ranges, and comma-separated ranges', () => {
    expect(parsePageRanges('1-3, 5, 8-9')).toEqual({
      ok: true,
      ranges: [
        { startPage: 1, endPage: 3 },
        { startPage: 5, endPage: 5 },
        { startPage: 8, endPage: 9 },
      ],
    });
  });

  it.each(['0', '3-1', 'abc', '1-', '1,,2', '1-2-3'])(
    'rejects invalid page expression %s',
    (value) => {
      const result = parsePageRanges(value);
      expect(result.ok).toBe(false);
    },
  );

  it('rejects duplicate pages across ranges', () => {
    expect(parsePageRanges('1-3,3-5')).toEqual({
      ok: false,
      error: 'Page 3 is listed more than once',
    });
  });
});
