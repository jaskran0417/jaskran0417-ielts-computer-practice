import { describe, expect, it, vi } from 'vitest';
import {
  bundledPdfWorkerUrl,
  extractPdf,
  renderPdfPageForEvidence,
  type PdfDocumentLoader,
} from './pdf-adapter';

function createLoader(): PdfDocumentLoader {
  const textItems = Array.from({ length: 10 }, (_, index) => ({
    str: `Selectable text block ${index + 1} with enough content`,
    transform: [1, 0, 0, 16, 20, 180 - index * 14],
    width: 220,
    height: 16,
  }));

  return {
    imageOperatorCodes: new Set([77]),
    async load() {
      return {
        numPages: 1,
        async getPage(pageNumber: number) {
          expect(pageNumber).toBe(1);
          return {
            getViewport() {
              return {
                width: 300,
                height: 200,
                convertToViewportPoint(x: number, y: number) {
                  return [x, 200 - y] as const;
                },
              };
            },
            async getTextContent() {
              return { items: textItems };
            },
            async getOperatorList() {
              return { fnArray: [12, 77, 14] };
            },
          };
        },
      };
    },
  };
}

describe('extractPdf', () => {
  it('uses a bundled same-origin PDF worker URL', () => {
    expect(bundledPdfWorkerUrl).not.toMatch(/^https?:\/\//i);
    expect(bundledPdfWorkerUrl).toMatch(/pdf\.worker/i);
  });

  it('extracts text, normalized geometry, page signals, and classification', async () => {
    const pages = await extractPdf(new ArrayBuffer(8), createLoader());

    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].width).toBe(300);
    expect(pages[0].height).toBe(200);
    expect(pages[0].items).toHaveLength(10);
    expect(pages[0].items[0].text).toContain('Selectable text block 1');
    expect(pages[0].signals.textItemCount).toBe(10);
    expect(pages[0].signals.imageObjectCount).toBe(1);
    expect(pages[0].kind).toBe('DIGITAL_TEXT');

    for (const item of pages[0].items) {
      expect(item.rect.x).toBeGreaterThanOrEqual(0);
      expect(item.rect.y).toBeGreaterThanOrEqual(0);
      expect(item.rect.width).toBeGreaterThanOrEqual(0);
      expect(item.rect.height).toBeGreaterThanOrEqual(0);
      expect(item.rect.x + item.rect.width).toBeLessThanOrEqual(1);
      expect(item.rect.y + item.rect.height).toBeLessThanOrEqual(1);
    }
  });
});


describe('renderPdfPageForEvidence', () => {
  it('returns PNG evidence bytes and rendered dimensions', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      toBlob(callback: (blob: Blob | null) => void) {
        callback(new Blob(['png'], { type: 'image/png' }));
      },
    } as unknown as HTMLCanvasElement;

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tagName: string) =>
        tagName === 'canvas' ? canvas : originalCreateElement(tagName)) as typeof document.createElement);

    try {
      const result = await renderPdfPageForEvidence(new ArrayBuffer(8), 1, 2, {
        async load() {
          return {
            numPages: 1,
            async getPage() {
              return {
                getViewport({ scale }: { scale: number }) {
                  return { width: 100 * scale, height: 50 * scale };
                },
                async getTextContent() {
                  return { items: [] };
                },
                render() {
                  return { promise: Promise.resolve() };
                },
              } as never;
            },
          };
        },
      });

      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
      expect(result.image.type).toBe('image/png');
    } finally {
      createElementSpy.mockRestore();
    }
  });
});
