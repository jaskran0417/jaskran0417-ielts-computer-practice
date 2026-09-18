import { describe, expect, it } from 'vitest';
import type { ImportFieldRecord } from '../local/import-repository';
import { fieldsToReadingBlocks, preferredImportFieldText } from './reading-import-source-selection';

function pdfField(value: string): ImportFieldRecord {
  return {
    id: 'page-11',
    kind: 'PASSAGE_TEXT',
    critical: true,
    verification: {
      state: 'VERIFIED',
      normalizedValue: value,
      reasons: [],
      passA: {
        value,
        confidence: null,
        evidence: {
          documentId: 'reading-pdf',
          pageNumber: 11,
          method: 'PDF_TEXT',
        },
      },
    },
  };
}

describe('Reading import source normalization', () => {
  it('removes invisible PDF spacing artifacts before semantic parsing', () => {
    const field = pdfField(
      [
        'Questions 28-31',
        'October 12, 1492 arrival in \u200b29. ……………. Christopher Columbus',
        '25.\u200b According to the text',
        'Passage 3 has six paragraphs labelled\u00a0 A \u200b-\u200b F.',
        'i.\u200b Beach garbage from far away',
      ].join('\n'),
    );

    const text = preferredImportFieldText(field);
    expect(text).toContain('arrival in 29.');
    expect(text).toContain('25. According to the text');
    expect(text).toContain('labelled A - F.');
    expect(text).toContain('i. Beach garbage from far away');
    expect(text).not.toMatch(/[\u200B-\u200D\uFEFF\u00A0]/);

    expect(fieldsToReadingBlocks([field])[0]?.text).toBe(text);
  });
});
