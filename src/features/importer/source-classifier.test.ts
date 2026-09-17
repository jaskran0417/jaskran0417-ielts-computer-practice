import { describe, expect, it } from 'vitest';
import { classifyPdfPage, type PdfPageSignals } from './source-classifier';

function signals(overrides: Partial<PdfPageSignals> = {}): PdfPageSignals {
  return {
    textItemCount: 0,
    nonWhitespaceCharacters: 0,
    imageObjectCount: 0,
    pageArea: 1,
    ...overrides,
  };
}

describe('classifyPdfPage', () => {
  it('classifies a page with no useful text as a likely scan', () => {
    expect(classifyPdfPage(signals({ imageObjectCount: 1 }))).toBe('LIKELY_SCAN');
  });

  it('classifies substantial selectable text as digital text', () => {
    expect(
      classifyPdfPage(
        signals({
          textItemCount: 70,
          nonWhitespaceCharacters: 1600,
        }),
      ),
    ).toBe('DIGITAL_TEXT');
  });

  it('classifies sparse text combined with imagery as mixed', () => {
    expect(
      classifyPdfPage(
        signals({
          textItemCount: 7,
          nonWhitespaceCharacters: 80,
          imageObjectCount: 2,
        }),
      ),
    ).toBe('MIXED');
  });

  it('treats a tiny text fragment without page imagery as a likely scan', () => {
    expect(
      classifyPdfPage(
        signals({
          textItemCount: 1,
          nonWhitespaceCharacters: 4,
        }),
      ),
    ).toBe('LIKELY_SCAN');
  });
});
