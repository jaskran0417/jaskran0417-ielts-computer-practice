import type { ExtractionPass, VerificationResult } from './domain';

export function normalizeExtractedText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function verifyCriticalText(
  passA: ExtractionPass,
  passB: ExtractionPass,
): VerificationResult {
  const normalizedA = normalizeExtractedText(passA.value);
  const normalizedB = normalizeExtractedText(passB.value);

  if (!normalizedA && !normalizedB) {
    return {
      state: 'UNREADABLE',
      normalizedValue: null,
      reasons: ['Both independent extraction passes are blank'],
      passA,
      passB,
    };
  }

  if (normalizedA && normalizedA === normalizedB) {
    return {
      state: 'VERIFIED',
      normalizedValue: normalizedA,
      reasons: [],
      passA,
      passB,
    };
  }

  return {
    state: 'REVIEW_REQUIRED',
    normalizedValue: null,
    reasons: ['Independent extraction passes disagree'],
    passA,
    passB,
  };
}
