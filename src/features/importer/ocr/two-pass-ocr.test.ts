import { describe, expect, it } from 'vitest';
import type { OcrEngine, OcrResult } from './ocr-engine';
import { runTwoPassOcr } from './two-pass-ocr';

class FakeOcrEngine implements OcrEngine {
  constructor(
    private readonly results: Record<'A' | 'B', OcrResult>,
  ) {}

  async recognize(_image: Blob, options: { pass: 'A' | 'B' }): Promise<OcrResult> {
    return this.results[options.pass];
  }
}

describe('runTwoPassOcr', () => {
  it('returns VERIFIED while preserving both independent OCR passes when they agree', async () => {
    const engine = new FakeOcrEngine({
      A: { text: 'NO MORE THAN TWO WORDS', confidence: 97 },
      B: { text: ' NO MORE THAN TWO WORDS ', confidence: 92 },
    });

    const result = await runTwoPassOcr(new Blob(['image']), engine, {
      documentId: 'doc-1',
      pageNumber: 2,
    });

    expect(result.state).toBe('VERIFIED');
    expect(result.normalizedValue).toBe('NO MORE THAN TWO WORDS');
    expect(result.passA?.confidence).toBe(97);
    expect(result.passB?.confidence).toBe(92);
    expect(result.passA?.evidence.method).toBe('OCR_A');
    expect(result.passB?.evidence.method).toBe('OCR_B');
  });

  it('returns REVIEW_REQUIRED when OCR passes disagree instead of choosing one', async () => {
    const engine = new FakeOcrEngine({
      A: { text: 'accommodation', confidence: 91 },
      B: { text: 'accomodation', confidence: 94 },
    });

    const result = await runTwoPassOcr(new Blob(['image']), engine, {
      documentId: 'doc-1',
      pageNumber: 3,
    });

    expect(result.state).toBe('REVIEW_REQUIRED');
    expect(result.normalizedValue).toBeNull();
    expect(result.passA?.value).toBe('accommodation');
    expect(result.passB?.value).toBe('accomodation');
  });
});
