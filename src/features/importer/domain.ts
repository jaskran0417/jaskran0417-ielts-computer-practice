export type VerificationState =
  | 'VERIFIED'
  | 'CONFIRMED'
  | 'REVIEW_REQUIRED'
  | 'UNREADABLE';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ExtractionMethod = 'PDF_TEXT' | 'OCR_A' | 'OCR_B' | 'MANUAL';

export interface SourceEvidence {
  documentId: string;
  pageNumber: number;
  region?: NormalizedRect;
  method: ExtractionMethod;
}

export interface ExtractionPass {
  value: string;
  confidence: number | null;
  evidence: SourceEvidence;
}

export interface VerificationResult {
  state: VerificationState;
  normalizedValue: string | null;
  reasons: string[];
  passA?: ExtractionPass;
  passB?: ExtractionPass;
}
