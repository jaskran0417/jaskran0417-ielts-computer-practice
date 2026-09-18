import type { AnswerNormalizationPolicy } from '../features/importer/answers/types';

function stripPunctuation(value: string, mode: AnswerNormalizationPolicy['punctuation']): string {
  if (mode === 'STRICT') return value;
  if (mode === 'IGNORE_TERMINAL') {
    return value.replace(/[.,!?;:]+$/g, '');
  }
  return value.replace(/[.,!?;:'"()[\]{}-]/g, ' ');
}

export function normalizeResponse(
  value: string,
  policy: AnswerNormalizationPolicy,
): string {
  let normalized = value.trim();

  normalized = stripPunctuation(normalized, policy.punctuation);

  if (policy.collapseWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  if (!policy.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

export function responseExceedsMaxWords(
  value: string,
  policy: AnswerNormalizationPolicy,
): boolean {
  if (typeof policy.maxWords !== 'number') return false;

  const normalized = normalizeResponse(value, {
    ...policy,
    punctuation: 'LENIENT',
  });

  if (!normalized) return false;
  return normalized.split(/\s+/).filter(Boolean).length > policy.maxWords;
}
