import { describe, expect, it } from 'vitest';
import type { AnswerNormalizationPolicy } from '../features/importer/answers/types';
import { normalizeResponse, responseExceedsMaxWords } from './answer-normalization';

const base: AnswerNormalizationPolicy = {
  caseSensitive: false,
  collapseWhitespace: true,
  punctuation: 'IGNORE_TERMINAL',
};

describe('answer normalization', () => {
  it('normalizes case, repeated whitespace, and terminal punctuation', () => {
    expect(normalizeResponse('  The   Corona. ', base)).toBe('the corona');
  });

  it('preserves case when the policy requires it', () => {
    expect(
      normalizeResponse('TRUE', { ...base, caseSensitive: true }),
    ).toBe('TRUE');
  });

  it('enforces maximum word rules separately from normalization', () => {
    expect(
      responseExceedsMaxWords('around six years', { ...base, maxWords: 2 }),
    ).toBe(true);
    expect(
      responseExceedsMaxWords('6 years', { ...base, maxWords: 2 }),
    ).toBe(false);
  });
});
