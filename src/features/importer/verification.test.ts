import { describe, expect, it } from 'vitest';
import type { ExtractionPass } from './domain';
import { verifyCriticalText } from './verification';

function pass(value: string, method: ExtractionPass['evidence']['method']): ExtractionPass {
  return {
    value,
    confidence: 95,
    evidence: {
      documentId: 'doc-1',
      pageNumber: 1,
      method,
    },
  };
}

describe('verifyCriticalText', () => {
  it('verifies independently extracted text when normalized values agree', () => {
    const result = verifyCriticalText(pass('  NO MORE THAN TWO WORDS ', 'OCR_A'), pass('NO MORE THAN TWO WORDS', 'OCR_B'));

    expect(result.state).toBe('VERIFIED');
    expect(result.normalizedValue).toBe('NO MORE THAN TWO WORDS');
    expect(result.reasons).toEqual([]);
  });

  it('requires review when critical text differs', () => {
    const result = verifyCriticalText(pass('library', 'OCR_A'), pass('libraries', 'OCR_B'));

    expect(result.state).toBe('REVIEW_REQUIRED');
    expect(result.normalizedValue).toBeNull();
    expect(result.reasons).toContain('Independent extraction passes disagree');
  });

  it('returns unreadable when both passes are blank', () => {
    const result = verifyCriticalText(pass('   ', 'OCR_A'), pass('\n', 'OCR_B'));

    expect(result.state).toBe('UNREADABLE');
    expect(result.normalizedValue).toBeNull();
  });

  it('does not treat TWO WORDS and THREE WORDS as equivalent', () => {
    const result = verifyCriticalText(
      pass('NO MORE THAN TWO WORDS AND/OR A NUMBER', 'OCR_A'),
      pass('NO MORE THAN THREE WORDS AND/OR A NUMBER', 'OCR_B'),
    );

    expect(result.state).toBe('REVIEW_REQUIRED');
  });
});
