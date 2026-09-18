import type { ImportFileProcessor } from './ImportWorkspace';
import { parseAnswerKey, type AnswerKeyParseResult } from './answer-key/parse-answer-key';
import type { NormalizedRect, VerificationResult } from './domain';
import type {
  ImportDraft,
  ImportFieldRecord,
  ImportVisualAssetRecord,
  SourceDocumentKind,
  SourceDocumentRecord,
} from './local/import-repository';
import type { OcrEngine } from './ocr/ocr-engine';
import { TesseractOcrEngine } from './ocr/tesseract-engine';
import { runTwoPassOcr } from './ocr/two-pass-ocr';
import {
  extractPdf as extractPdfDocument,
  renderPdfPageImage,
  type ExtractedPdfPage,
  type PdfPageRenderer,
} from './pdf/pdf-adapter';

type PdfExtractor = (data: ArrayBuffer) => Promise<ExtractedPdfPage[]>;
type AnswerKeyExtractor = (text: string) => AnswerKeyParseResult;

export interface LocalImportProcessorOptions {
  extractPdf?: PdfExtractor;
  renderPdfPage?: PdfPageRenderer;
  ocrEngine?: OcrEngine;
  parseAnswerKey?: AnswerKeyExtractor;
  createId?: () => string;
  now?: () => number;
}

function defaultCreateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || extensionOf(file.name) === '.pdf';
}

function isImage(file: File): boolean {
  return (
    file.type.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp'].includes(extensionOf(file.name))
  );
}

function isAnswerKeyText(file: File): boolean {
  return (
    file.type === 'text/plain' ||
    file.type === 'text/csv' ||
    file.type === 'application/json' ||
    ['.txt', '.csv', '.json'].includes(extensionOf(file.name))
  );
}

async function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Response(file).arrayBuffer();
}

function sourceRecord(
  file: File,
  id: string,
  kind: SourceDocumentKind,
  createdAtMs: number,
  sourceBytes: ArrayBuffer,
): SourceDocumentRecord {
  return {
    id,
    name: file.name,
    mediaType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    kind,
    createdAtMs,
    sourceBytes,
  };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

function visualKindForPdfText(text: string): ImportVisualAssetRecord['kind'] | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (/\blabel\b.*\bdiagram\b|\bdiagram\b.*\blabel\b/i.test(normalized)) {
    return 'DIAGRAM';
  }
  if (/\bcomplete\b.*\btable\b|\btable\b.*\bcomplete\b/i.test(normalized)) {
    return 'TABLE';
  }
  return null;
}

function normalizedPdfText(page: ExtractedPdfPage): string {
  const items = page.items
    .filter((item) => item.text.trim().length > 0)
    .slice()
    .sort((left, right) => {
      const vertical = left.rect.y - right.rect.y;
      if (Math.abs(vertical) > Math.max(left.rect.height, right.rect.height) * 0.5) {
        return vertical;
      }
      return left.rect.x - right.rect.x;
    });

  const lines: Array<{
    centerY: number;
    height: number;
    items: typeof items;
  }> = [];

  for (const item of items) {
    const centerY = item.rect.y + item.rect.height / 2;
    const line = lines.find(
      (candidate) =>
        Math.abs(candidate.centerY - centerY) <=
        Math.max(candidate.height, item.rect.height) * 0.55,
    );

    if (line) {
      line.items.push(item);
      const count = line.items.length;
      line.centerY = (line.centerY * (count - 1) + centerY) / count;
      line.height = Math.max(line.height, item.rect.height);
    } else {
      lines.push({
        centerY,
        height: item.rect.height,
        items: [item],
      });
    }
  }

  return lines
    .sort((left, right) => left.centerY - right.centerY)
    .map((line) =>
      line.items
        .slice()
        .sort((left, right) => left.rect.x - right.rect.x)
        .map((item) => item.text.trim())
        .join(' ')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

function pdfTextRegion(page: ExtractedPdfPage): NormalizedRect | undefined {
  const items = page.items.filter((item) => item.text.trim().length > 0);
  if (items.length === 0) return undefined;

  const left = Math.min(...items.map((item) => item.rect.x));
  const top = Math.min(...items.map((item) => item.rect.y));
  const right = Math.max(...items.map((item) => item.rect.x + item.rect.width));
  const bottom = Math.max(...items.map((item) => item.rect.y + item.rect.height));

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function pdfPageVerification(
  page: ExtractedPdfPage,
  documentId: string,
): VerificationResult {
  const value = normalizedPdfText(page);
  const passA = {
    value,
    confidence: null,
    evidence: {
      documentId,
      pageNumber: page.pageNumber,
      region: pdfTextRegion(page),
      method: 'PDF_TEXT' as const,
    },
  };

  if (!value) {
    return {
      state: 'UNREADABLE',
      normalizedValue: null,
      reasons: [
        page.kind === 'LIKELY_SCAN'
          ? 'No reliable selectable text was found on this PDF page; visual OCR or manual confirmation is required'
          : 'No readable text was extracted from this PDF page',
      ],
      passA,
    };
  }

  return {
    state: 'VERIFIED',
    normalizedValue: value,
    reasons: [],
    passA,
  };
}

function withSourceDocument(
  result: VerificationResult,
  documentId: string,
): VerificationResult {
  return {
    ...result,
    passA: result.passA
      ? {
          ...result.passA,
          evidence: {
            ...result.passA.evidence,
            documentId,
          },
        }
      : undefined,
    passB: result.passB
      ? {
          ...result.passB,
          evidence: {
            ...result.passB.evidence,
            documentId,
          },
        }
      : undefined,
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  if (quoted) {
    throw new Error('Answer-key CSV contains an unterminated quoted value');
  }

  cells.push(current.trim());
  return cells;
}

function normalizeCsvAnswerKey(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const cells = parseCsvLine(line);
      const questionNumber = Number(cells[0]);
      const answer = cells[1]?.trim();

      if (!Number.isInteger(questionNumber) || questionNumber <= 0 || !answer) {
        throw new Error('Answer-key CSV must use question number,answer rows');
      }

      return `${questionNumber} ${answer}`;
    })
    .join('\n');
}

function normalizeJsonAnswerKey(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Answer-key JSON is not valid JSON');
  }

  const entries: Array<{ questionNumber: number; answer: string }> = [];

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        throw new Error('Answer-key JSON arrays must contain question/answer objects');
      }

      const record = item as Record<string, unknown>;
      const questionNumber = Number(record.questionNumber ?? record.number);
      const rawAnswer = record.answer;

      if (
        !Number.isInteger(questionNumber) ||
        questionNumber <= 0 ||
        !['string', 'number', 'boolean'].includes(typeof rawAnswer)
      ) {
        throw new Error('Answer-key JSON objects require questionNumber and answer');
      }

      entries.push({ questionNumber, answer: String(rawAnswer).trim() });
    }
  } else if (parsed && typeof parsed === 'object') {
    for (const [key, rawAnswer] of Object.entries(parsed as Record<string, unknown>)) {
      const questionNumber = Number(key);

      if (
        !Number.isInteger(questionNumber) ||
        questionNumber <= 0 ||
        !['string', 'number', 'boolean'].includes(typeof rawAnswer)
      ) {
        throw new Error('Answer-key JSON object keys must be positive question numbers');
      }

      entries.push({ questionNumber, answer: String(rawAnswer).trim() });
    }
  } else {
    throw new Error('Answer-key JSON must be an object or an array of question/answer objects');
  }

  if (entries.length === 0 || entries.some((entry) => !entry.answer)) {
    throw new Error('Answer-key JSON does not contain usable answers');
  }

  return entries
    .sort((left, right) => left.questionNumber - right.questionNumber)
    .map((entry) => `${entry.questionNumber} ${entry.answer}`)
    .join('\n');
}

function normalizeAnswerKeySource(file: File, text: string): string {
  const extension = extensionOf(file.name);

  if (file.type === 'application/json' || extension === '.json') {
    return normalizeJsonAnswerKey(text);
  }

  if (file.type === 'text/csv' || extension === '.csv') {
    return normalizeCsvAnswerKey(text);
  }

  return text;
}

export function createLocalImportProcessor(
  options: LocalImportProcessorOptions = {},
): ImportFileProcessor {
  const pdfExtractor = options.extractPdf ?? extractPdfDocument;
  const pdfPageRenderer = options.renderPdfPage ?? renderPdfPageImage;
  const answerKeyExtractor = options.parseAnswerKey ?? parseAnswerKey;
  const ocrEngine = options.ocrEngine ?? new TesseractOcrEngine();
  const createId = options.createId ?? defaultCreateId;
  const now = options.now ?? Date.now;

  return async (file: File): Promise<ImportDraft> => {
    const createdAtMs = now();
    const sourceId = createId();
    const draftId = createId();
    const testId = createId();

    const originalSourceBytes = await readArrayBuffer(file);
    let kind: SourceDocumentKind;
    let fields: ImportFieldRecord[];
    const visualAssets: ImportVisualAssetRecord[] = [];

    if (isPdf(file)) {
      kind = 'PDF';
      const pdfData = originalSourceBytes;
      const pages = await pdfExtractor(pdfData.slice(0));

      if (pages.length === 0) {
        throw new Error('The PDF contains no readable pages');
      }

      fields = [];

      for (const page of pages) {
        let verification: VerificationResult;
        let renderedPage: Blob | null = null;

        if (page.kind === 'LIKELY_SCAN') {
          renderedPage = await pdfPageRenderer(pdfData.slice(0), page.pageNumber);
          verification = await runTwoPassOcr(renderedPage, ocrEngine, {
            documentId: sourceId,
            pageNumber: page.pageNumber,
            region: { x: 0, y: 0, width: 1, height: 1 },
          });
        } else {
          verification = pdfPageVerification(page, sourceId);
        }

        fields.push({
          id: createId(),
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification,
        });

        const visualKind = visualKindForPdfText(
          verification.normalizedValue ?? verification.passA?.value ?? '',
        );
        if (visualKind) {
          renderedPage ??= await pdfPageRenderer(pdfData.slice(0), page.pageNumber);
          visualAssets.push({
            id: `visual-${sourceId}-${page.pageNumber}`,
            sourceDocumentId: sourceId,
            pageNumber: page.pageNumber,
            kind: visualKind,
            mediaType: renderedPage.type || 'image/png',
            dataUrl: await blobToDataUrl(renderedPage),
            crop: { x: 0, y: 0, width: 1, height: 1 },
          });
        }
      }
    } else if (isImage(file)) {
      kind = 'IMAGE';
      const verification = await runTwoPassOcr(file, ocrEngine, {
        documentId: sourceId,
        pageNumber: 1,
        region: { x: 0, y: 0, width: 1, height: 1 },
      });

      fields = [
        {
          id: createId(),
          kind: 'OTHER',
          critical: true,
          verification,
        },
      ];
    } else if (isAnswerKeyText(file)) {
      kind = 'ANSWER_KEY';
      const text = normalizeAnswerKeySource(file, new TextDecoder().decode(originalSourceBytes));
      const result = answerKeyExtractor(text);

      if (result.verification.length === 0) {
        throw new Error(
          'No numbered answers were found. Answer-key text must include explicit question numbers.',
        );
      }

      fields = result.verification.map(({ questionNumber, result: verification }) => ({
        id: `answer-${questionNumber}-${createId()}`,
        kind: 'ANSWER',
        critical: true,
        verification: withSourceDocument(verification, sourceId),
      }));
    } else {
      throw new Error(
        `File type ${file.type || extensionOf(file.name) || 'unknown'} is not supported by the local importer yet`,
      );
    }

    return {
      id: draftId,
      testId,
      sourceDocuments: [sourceRecord(file, sourceId, kind, createdAtMs, originalSourceBytes.slice(0))],
      fields,
      ...(visualAssets.length > 0 ? { visualAssets } : {}),
      updatedAtMs: createdAtMs,
    };
  };
}
