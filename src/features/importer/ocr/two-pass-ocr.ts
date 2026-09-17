import type { NormalizedRect, SourceEvidence, VerificationResult } from '../domain';
import { verifyCriticalText } from '../verification';
import type { OcrEngine } from './ocr-engine';

export interface OcrSourceContext {
  documentId: string;
  pageNumber: number;
  region?: NormalizedRect;
}

function evidenceFor(
  source: OcrSourceContext,
  pass: 'A' | 'B',
): SourceEvidence {
  return {
    documentId: source.documentId,
    pageNumber: source.pageNumber,
    region: source.region,
    method: pass === 'A' ? 'OCR_A' : 'OCR_B',
  };
}

export async function runTwoPassOcr(
  image: Blob,
  engine: OcrEngine,
  source: OcrSourceContext,
): Promise<VerificationResult> {
  const [resultA, resultB] = await Promise.all([
    engine.recognize(image, { pass: 'A' }),
    engine.recognize(image, { pass: 'B' }),
  ]);

  return verifyCriticalText(
    {
      value: resultA.text,
      confidence: resultA.confidence,
      evidence: evidenceFor(source, 'A'),
    },
    {
      value: resultB.text,
      confidence: resultB.confidence,
      evidence: evidenceFor(source, 'B'),
    },
  );
}
