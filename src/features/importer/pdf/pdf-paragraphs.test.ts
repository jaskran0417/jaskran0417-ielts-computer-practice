import { describe, expect, it } from 'vitest';
import { normalizedPdfText } from '../local-file-processor';
import { buildStructuredReadingDraft } from '../reading/reading-structure-parser';

describe('PDF passage paragraphs', () => {
  it('preserves paragraph gaps and joins wrapped lines in the Reading passage', () => {
    const lines = [
      ['Passage 1', .05], ['City parks', .1], ['Trees provide shade and', .15],
      ['support wildlife.', .168], ['Parks also improve health.', .21],
      ['Questions 1-1', .3], ['Choose the appropriate letter A, B, C or D.', .34],
      ['1. Which benefit is mentioned?', .38],
    ] as const;
    const text = normalizedPdfText({ pageNumber: 1, width: 600, height: 800, kind: 'DIGITAL_TEXT',
      signals: { textItemCount: lines.length, imageObjectCount: 0, textCoverageRatio: .3 } as never,
      items: lines.map(([text, y]) => ({ text, pageNumber: 1, rect: { x: .1, y, width: .6, height: .012 } })) });
    expect(text).toContain('Trees provide shade and\nsupport wildlife.\n\nParks also improve health.');
    const draft = buildStructuredReadingDraft({ blocks: [{ pageNumber: 1, text, evidence: [] }], visualRegions: [] });
    expect(draft.sections[0].passageText).toEqual(['Trees provide shade and support wildlife.', 'Parks also improve health.']);
  });
});
