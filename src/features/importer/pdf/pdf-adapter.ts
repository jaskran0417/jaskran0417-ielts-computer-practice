import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { NormalizedRect } from '../domain';
import { classifyPdfPage, type PdfPageKind, type PdfPageSignals } from '../source-classifier';

export interface ExtractedTextItem {
  text: string;
  pageNumber: number;
  rect: NormalizedRect;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  width: number;
  height: number;
  items: ExtractedTextItem[];
  signals: PdfPageSignals;
  kind: PdfPageKind;
}

interface PdfTextItemLike {
  str: string;
  transform: readonly number[];
  width: number;
  height: number;
}

interface PdfViewportLike {
  width: number;
  height: number;
  convertToViewportPoint?: (x: number, y: number) => readonly [number, number] | number[];
}

interface PdfPageLike {
  getViewport(options: { scale: number }): PdfViewportLike;
  getTextContent(): Promise<{ items: unknown[] }>;
  getOperatorList?(): Promise<{ fnArray: number[] }>;
  render?(options: { canvasContext: unknown; viewport: PdfViewportLike }): {
    promise: Promise<void>;
  };
}

interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
  destroy?(): Promise<void>;
}

export interface PdfDocumentLoader {
  imageOperatorCodes?: ReadonlySet<number>;
  load(data: Uint8Array): Promise<PdfDocumentLike>;
}

export type PdfPageRenderer = (
  data: ArrayBuffer,
  pageNumber: number,
) => Promise<Blob>;

export const bundledPdfWorkerUrl = pdfWorkerUrl;

const pdfJsImageOperatorCodes = new Set<number>();

export const pdfJsLegacyLoader: PdfDocumentLoader = {
  imageOperatorCodes: pdfJsImageOperatorCodes,
  async load(data: Uint8Array): Promise<PdfDocumentLike> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    pdfjs.GlobalWorkerOptions.workerSrc = bundledPdfWorkerUrl;

    pdfJsImageOperatorCodes.clear();
    pdfJsImageOperatorCodes.add(pdfjs.OPS.paintImageXObject);
    pdfJsImageOperatorCodes.add(pdfjs.OPS.paintInlineImageXObject);
    pdfJsImageOperatorCodes.add(pdfjs.OPS.paintImageMaskXObject);

    const loadingTask = pdfjs.getDocument({ data });
    return (await loadingTask.promise) as unknown as PdfDocumentLike;
  },
};

function isTextItem(item: unknown): item is PdfTextItemLike {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const candidate = item as Partial<PdfTextItemLike>;
  return (
    typeof candidate.str === 'string' &&
    Array.isArray(candidate.transform) &&
    candidate.transform.length >= 6 &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number'
  );
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toNormalizedRect(item: PdfTextItemLike, viewport: PdfViewportLike): NormalizedRect {
  const pageWidth = Math.max(1, viewport.width);
  const pageHeight = Math.max(1, viewport.height);
  const sourceX = Number(item.transform[4]) || 0;
  const sourceY = Number(item.transform[5]) || 0;
  const viewportPoint = viewport.convertToViewportPoint?.(sourceX, sourceY);
  const xPx = Number(viewportPoint?.[0] ?? sourceX) || 0;
  const baselineYPx = Number(viewportPoint?.[1] ?? pageHeight - sourceY) || 0;
  const heightPx = Math.max(
    0,
    Math.abs(item.height) || Math.hypot(Number(item.transform[2]) || 0, Number(item.transform[3]) || 0),
  );
  const widthPx = Math.max(0, Math.abs(item.width));

  const x = clamp(xPx / pageWidth);
  const y = clamp((baselineYPx - heightPx) / pageHeight);
  const width = clamp(widthPx / pageWidth, 0, 1 - x);
  const height = clamp(heightPx / pageHeight, 0, 1 - y);

  return { x, y, width, height };
}

async function countImageOperators(
  page: PdfPageLike,
  imageOperatorCodes: ReadonlySet<number> | undefined,
): Promise<number> {
  if (!page.getOperatorList || !imageOperatorCodes || imageOperatorCodes.size === 0) {
    return 0;
  }

  const operatorList = await page.getOperatorList();
  return operatorList.fnArray.reduce(
    (count, operatorCode) => count + (imageOperatorCodes.has(operatorCode) ? 1 : 0),
    0,
  );
}

export async function extractPdf(
  data: ArrayBuffer,
  loader: PdfDocumentLoader = pdfJsLegacyLoader,
): Promise<ExtractedPdfPage[]> {
  const document = await loader.load(new Uint8Array(data));
  const pages: ExtractedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const textItems = textContent.items.filter(isTextItem);
    const items: ExtractedTextItem[] = textItems.map((item) => ({
      text: item.str,
      pageNumber,
      rect: toNormalizedRect(item, viewport),
    }));
    const imageObjectCount = await countImageOperators(page, loader.imageOperatorCodes);
    const nonWhitespaceCharacters = items.reduce(
      (total, item) => total + item.text.replace(/\s/g, '').length,
      0,
    );
    const signals: PdfPageSignals = {
      textItemCount: items.length,
      nonWhitespaceCharacters,
      imageObjectCount,
      pageArea: Math.max(1, viewport.width * viewport.height),
    };

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      items,
      signals,
      kind: classifyPdfPage(signals),
    });
  }

  return pages;
}


function renderedCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to encode rendered PDF page'));
      }
    }, 'image/png');
  });
}

export async function renderPdfPageForEvidence(
  data: ArrayBuffer,
  pageNumber: number,
  scale = 2,
  loader: PdfDocumentLoader = pdfJsLegacyLoader,
): Promise<{ image: Blob; width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new Error('PDF page rendering requires browser canvas APIs');
  }

  const pdfDocument = await loader.load(new Uint8Array(data));

  try {
    if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
      throw new Error(`PDF page ${pageNumber} is outside the document range`);
    }

    const page = await pdfDocument.getPage(pageNumber);
    if (!page.render) {
      throw new Error('PDF loader does not support page rendering');
    }

    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Unable to create PDF page rendering canvas');
    }

    await page.render({ canvasContext: context, viewport }).promise;
    const image = await renderedCanvasToBlob(canvas);

    return { image, width, height };
  } finally {
    await pdfDocument.destroy?.();
  }
}

export const renderPdfPageImage: PdfPageRenderer = async (data, pageNumber) =>
  (await renderPdfPageForEvidence(data, pageNumber)).image;
