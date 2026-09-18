import type { ImportFileProcessor } from './ImportWorkspace';
import { parseAnswerKey, type AnswerKeyParseResult } from './answer-key/parse-answer-key';
import type { VerificationResult } from './domain';
import type {
  ImportDraft,
  ImportFieldRecord,
  SourceDocumentKind,
  SourceDocumentRecord,
} from './local/import-repository';
import type { OcrEngine } from './ocr/ocr-engine';
import { TesseractOcrEngine } from './ocr/tesseract-engine';
import { runTwoPassOcr } from './ocr/two-pass-ocr';
import {
  extractPdf as extractPdfDocument,
  type ExtractedPdfPage,
} from './pdf/pdf-adapter';

type PdfExtractor = (data: ArrayBuffer) => Promise<ExtractedPdfPage[]>;
type AnswerKeyExtractor = (text: string) => AnswerKeyParseResult;

export interface LocalImportProcessorOptions {
  extractPdf?: PdfExtractor;
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

async function readText(file: File): Promise<string> {
  return new TextDecoder().decode(await readArrayBuffer(file));
}

function sourceRecord(
  file: File,
  id: string,
  kind: SourceDocumentKind,
  createdAtMs: number,
): SourceDocumentRecord {
  return {
    id,
    name: file.name,
    mediaType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    kind,
    createdAtMs,
  };
}

function normalizedPdfText(page: ExtractedPdfPage): string {
  return page.items
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    state: 'REVIEW_REQUIRED',
    normalizedValue: null,
    reasons: [
      page.kind === 'MIXED'
        ? 'This mixed text/image PDF page requires independent visual confirmation before publication'
        : 'Selectable PDF text requires independent visual confirmation before publication',
    ],
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
  const answerKeyExtractor = options.parseAnswerKey ?? parseAnswerKey;
  const ocrEngine = options.ocrEngine ?? new TesseractOcrEngine();
  const createId = options.createId ?? defaultCreateId;
  const now = options.now ?? Date.now;

  return async (file: File): Promise<ImportDraft> => {
    const createdAtMs = now();
    const sourceId = createId();
    const draftId = createId();
    const testId = createId();

    let kind: SourceDocumentKind;
    let fields: ImportFieldRecord[];

    if (isPdf(file)) {
      kind = 'PDF';
      const pages = await pdfExtractor(await readArrayBuffer(file));

      if (pages.length === 0) {
        throw new Error('The PDF contains no readable pages');
      }

      fields = pages.map((page) => ({
        id: createId(),
        kind: 'PASSAGE_TEXT',
        critical: true,
        verification: pdfPageVerification(page, sourceId),
      }));
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
      const text = normalizeAnswerKeySource(file, await readText(file));
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
      sourceDocuments: [sourceRecord(file, sourceId, kind, createdAtMs)],
      fields,
      updatedAtMs: createdAtMs,
    };
  };
}
