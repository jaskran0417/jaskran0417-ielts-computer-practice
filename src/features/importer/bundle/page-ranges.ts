import type { PageRange } from './types';

export type PageRangeParseResult =
  | { ok: true; ranges: PageRange[] }
  | { ok: false; error: string };

const TOKEN_PATTERN = /^(\d+)(?:-(\d+))?$/;

export function parsePageRanges(value: string): PageRangeParseResult {
  const normalized = value.trim();
  if (!normalized) {
    return { ok: false, error: 'Enter at least one page' };
  }

  const tokens = normalized.split(',').map((token) => token.trim());
  if (tokens.some((token) => token.length === 0)) {
    return { ok: false, error: 'Page ranges contain an empty entry' };
  }

  const ranges: PageRange[] = [];
  const seenPages = new Set<number>();

  for (const token of tokens) {
    const match = TOKEN_PATTERN.exec(token);
    if (!match) {
      return { ok: false, error: `Invalid page range: ${token}` };
    }

    const startPage = Number(match[1]);
    const endPage = match[2] ? Number(match[2]) : startPage;

    if (
      !Number.isSafeInteger(startPage) ||
      !Number.isSafeInteger(endPage) ||
      startPage <= 0 ||
      endPage <= 0
    ) {
      return { ok: false, error: `Page numbers must be positive integers: ${token}` };
    }

    if (startPage > endPage) {
      return { ok: false, error: `Page range must increase: ${token}` };
    }

    for (let page = startPage; page <= endPage; page += 1) {
      if (seenPages.has(page)) {
        return { ok: false, error: `Page ${page} is listed more than once` };
      }
      seenPages.add(page);
    }

    ranges.push({ startPage, endPage });
  }

  return { ok: true, ranges };
}
