export type PdfPageKind = 'DIGITAL_TEXT' | 'LIKELY_SCAN' | 'MIXED';

export interface PdfPageSignals {
  textItemCount: number;
  nonWhitespaceCharacters: number;
  imageObjectCount: number;
  pageArea: number;
}

export const PDF_PAGE_CLASSIFICATION_THRESHOLDS = {
  minimumDigitalTextItems: 8,
  minimumDigitalCharacters: 200,
  minimumMixedCharacters: 20,
} as const;

export function classifyPdfPage(signals: PdfPageSignals): PdfPageKind {
  const textItems = Math.max(0, signals.textItemCount);
  const characters = Math.max(0, signals.nonWhitespaceCharacters);
  const images = Math.max(0, signals.imageObjectCount);

  if (
    textItems >= PDF_PAGE_CLASSIFICATION_THRESHOLDS.minimumDigitalTextItems &&
    characters >= PDF_PAGE_CLASSIFICATION_THRESHOLDS.minimumDigitalCharacters
  ) {
    return 'DIGITAL_TEXT';
  }

  if (images > 0 && characters >= PDF_PAGE_CLASSIFICATION_THRESHOLDS.minimumMixedCharacters) {
    return 'MIXED';
  }

  return 'LIKELY_SCAN';
}
