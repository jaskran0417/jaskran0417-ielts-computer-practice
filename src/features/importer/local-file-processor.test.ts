import { describe, expect, it, vi } from 'vitest';
import type { OcrEngine } from './ocr/ocr-engine';
import type { ExtractedPdfPage } from './pdf/pdf-adapter';
import { createLocalImportProcessor } from './local-file-processor';

function idFactory() {
  let counter = 0;
  return () => `id-${++counter}`;
}

describe('createLocalImportProcessor', () => {
  it('turns selectable PDF text into an evidence-backed review draft without remote APIs', async () => {
    const pages: ExtractedPdfPage[] = [
      {
        pageNumber: 1,
        width: 600,
        height: 800,
        kind: 'DIGITAL_TEXT',
        signals: {
          textItemCount: 2,
          nonWhitespaceCharacters: 35,
          imageObjectCount: 0,
          pageArea: 480_000,
        },
        items: [
          {
            text: 'Urban libraries are changing.',
            pageNumber: 1,
            rect: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
          },
          {
            text: 'Choose ONE WORD ONLY.',
            pageNumber: 1,
            rect: { x: 0.1, y: 0.2, width: 0.4, height: 0.05 },
          },
        ],
      },
    ];
    const extractPdf = vi.fn(async () => pages);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network disabled'));

    try {
      const processor = createLocalImportProcessor({
        extractPdf,
        createId: idFactory(),
        now: () => 1_000,
      });
      const draft = await processor(
        new File(['fake-pdf'], 'reading.pdf', { type: 'application/pdf' }),
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(extractPdf).toHaveBeenCalledTimes(1);
      expect(draft.sourceDocuments).toEqual([
        expect.objectContaining({
          name: 'reading.pdf',
          kind: 'PDF',
          mediaType: 'application/pdf',
          sourceBytes: expect.any(ArrayBuffer),
        }),
      ]);
      expect(new TextDecoder().decode(draft.sourceDocuments[0].sourceBytes)).toBe('fake-pdf');
      expect(draft.fields).toHaveLength(1);
      expect(draft.fields[0]).toMatchObject({
        kind: 'PASSAGE_TEXT',
        critical: true,
        verification: {
          state: 'REVIEW_REQUIRED',
          normalizedValue: null,
        },
      });
      expect(draft.fields[0].verification.passA).toMatchObject({
        value: 'Urban libraries are changing.\nChoose ONE WORD ONLY.',
        evidence: {
          pageNumber: 1,
          method: 'PDF_TEXT',
          region: { x: 0.1, y: 0.1, width: 0.5, height: 0.15 },
        },
      });
      expect(draft.fields[0].verification.passA?.evidence.documentId).toBe(
        draft.sourceDocuments[0].id,
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('renders scan-only PDF pages locally and runs two independent OCR passes', async () => {
    const pages: ExtractedPdfPage[] = [
      {
        pageNumber: 1,
        width: 600,
        height: 800,
        kind: 'LIKELY_SCAN',
        signals: {
          textItemCount: 0,
          nonWhitespaceCharacters: 0,
          imageObjectCount: 1,
          pageArea: 480_000,
        },
        items: [],
      },
    ];
    const renderedPage = new Blob(['rendered-page'], { type: 'image/png' });
    const renderPdfPage = vi.fn(async () => renderedPage);
    const engine: OcrEngine = {
      async recognize(image, options) {
        expect(image).toBe(renderedPage);
        return {
          text: options.pass === 'A' ? 'Choose ONE WORD ONLY' : 'Choose ONE WORD ONLY',
          confidence: options.pass === 'A' ? 90 : 94,
        };
      },
    };

    const processor = createLocalImportProcessor({
      extractPdf: async () => pages,
      renderPdfPage,
      ocrEngine: engine,
      createId: idFactory(),
      now: () => 1_500,
    });

    const draft = await processor(
      new File(['scan-pdf'], 'scan.pdf', { type: 'application/pdf' }),
    );

    expect(renderPdfPage).toHaveBeenCalledTimes(1);
    expect(renderPdfPage).toHaveBeenCalledWith(expect.any(ArrayBuffer), 1);
    expect(draft.fields).toHaveLength(1);
    expect(draft.fields[0]).toMatchObject({
      kind: 'PASSAGE_TEXT',
      critical: true,
      verification: {
        state: 'VERIFIED',
        normalizedValue: 'Choose ONE WORD ONLY',
      },
    });
    expect(draft.fields[0].verification.passA?.evidence).toMatchObject({
      documentId: draft.sourceDocuments[0].id,
      pageNumber: 1,
      method: 'OCR_A',
    });
    expect(draft.fields[0].verification.passB?.evidence.method).toBe('OCR_B');
  });

  it('runs two independent OCR passes for an image source', async () => {
    const engine: OcrEngine = {
      async recognize(_image, options) {
        return {
          text: options.pass === 'A' ? 'Library closes at six' : 'Library closes at six',
          confidence: options.pass === 'A' ? 91 : 95,
        };
      },
    };
    const processor = createLocalImportProcessor({
      ocrEngine: engine,
      createId: idFactory(),
      now: () => 2_000,
    });

    const draft = await processor(
      new File(['image'], 'scan.png', { type: 'image/png' }),
    );

    expect(draft.sourceDocuments[0].kind).toBe('IMAGE');
    expect(draft.fields).toHaveLength(1);
    expect(draft.fields[0].critical).toBe(true);
    expect(draft.fields[0].verification.state).toBe('VERIFIED');
    expect(draft.fields[0].verification.normalizedValue).toBe('Library closes at six');
    expect(draft.fields[0].verification.passA?.evidence.method).toBe('OCR_A');
    expect(draft.fields[0].verification.passB?.evidence.method).toBe('OCR_B');
  });

  it('parses a numbered text answer key into independently checked answer fields', async () => {
    const processor = createLocalImportProcessor({
      createId: idFactory(),
      now: () => 3_000,
    });

    const draft = await processor(
      new File(['1 library\n2 B\n3 TRUE'], 'answers.txt', { type: 'text/plain' }),
    );

    expect(draft.sourceDocuments[0].kind).toBe('ANSWER_KEY');
    expect(draft.fields).toHaveLength(3);
    expect(draft.fields.map((field) => field.kind)).toEqual(['ANSWER', 'ANSWER', 'ANSWER']);
    expect(draft.fields.map((field) => field.verification.state)).toEqual([
      'VERIFIED',
      'VERIFIED',
      'VERIFIED',
    ]);
    for (const field of draft.fields) {
      expect(field.verification.passA?.evidence.documentId).toBe(
        draft.sourceDocuments[0].id,
      );
      expect(field.verification.passB?.evidence.documentId).toBe(
        draft.sourceDocuments[0].id,
      );
    }
  });

  it('rejects unsupported formats instead of guessing their content', async () => {
    const processor = createLocalImportProcessor({
      createId: idFactory(),
      now: () => 4_000,
    });

    await expect(
      processor(
        new File(['docx'], 'paper.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).rejects.toThrow(/not supported/i);
  });

  it('retains rendered visual snapshots for diagram and table question pages', async () => {
    const pages: ExtractedPdfPage[] = [
      {
        pageNumber: 3,
        width: 600,
        height: 800,
        kind: 'MIXED',
        signals: {
          textItemCount: 2,
          nonWhitespaceCharacters: 45,
          imageObjectCount: 2,
          pageArea: 480_000,
        },
        items: [
          {
            text: 'Questions 1-4',
            pageNumber: 3,
            rect: { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
          },
          {
            text: 'Label the diagram below with the names of the layers of the sun.',
            pageNumber: 3,
            rect: { x: 0.1, y: 0.16, width: 0.7, height: 0.05 },
          },
        ],
      },
      {
        pageNumber: 11,
        width: 600,
        height: 800,
        kind: 'DIGITAL_TEXT',
        signals: {
          textItemCount: 2,
          nonWhitespaceCharacters: 35,
          imageObjectCount: 0,
          pageArea: 480_000,
        },
        items: [
          {
            text: 'Questions 28-31',
            pageNumber: 11,
            rect: { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
          },
          {
            text: 'Complete the table below.',
            pageNumber: 11,
            rect: { x: 0.1, y: 0.16, width: 0.5, height: 0.05 },
          },
        ],
      },
    ];
    const renderPdfPage = vi.fn(async (_data: ArrayBuffer, pageNumber: number) =>
      new Blob([`visual-page-${pageNumber}`], { type: 'image/png' }),
    );

    const processor = createLocalImportProcessor({
      extractPdf: async () => pages,
      renderPdfPage,
      createId: idFactory(),
      now: () => 5_000,
    });

    const draft = await processor(
      new File(['visual-pdf'], 'reading.pdf', { type: 'application/pdf' }),
    );

    expect(renderPdfPage).toHaveBeenCalledTimes(2);
    expect(draft.visualAssets).toEqual([
      expect.objectContaining({
        pageNumber: 3,
        kind: 'DIAGRAM',
        mediaType: 'image/png',
        dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
        crop: { x: 0, y: 0, width: 1, height: 1 },
      }),
      expect.objectContaining({
        pageNumber: 11,
        kind: 'TABLE',
        mediaType: 'image/png',
        dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
        crop: { x: 0, y: 0, width: 1, height: 1 },
      }),
    ]);
  });
});
