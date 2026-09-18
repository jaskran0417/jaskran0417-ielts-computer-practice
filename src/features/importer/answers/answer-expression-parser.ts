import type { InstructionConstraints, ReadingQuestionType } from '../reading/types';
import type { SourceEvidence } from '../domain';
import type {
  AnswerDefinitionDraft,
  AnswerNormalizationPolicy,
} from './types';

function policyFromConstraints(
  constraints: InstructionConstraints,
): AnswerNormalizationPolicy {
  return {
    caseSensitive: false,
    collapseWhitespace: true,
    punctuation: 'IGNORE_TERMINAL',
    maxWords: constraints.maxWords,
    numbersAllowed: constraints.numbersAllowed,
    orderSensitive: true,
  };
}

function normalizeEnumeratedAnswer(
  raw: string,
  questionType: ReadingQuestionType | undefined,
): string {
  const token = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');

  if (questionType === 'TRUE_FALSE_NOT_GIVEN') {
    if (token === 'T') return 'TRUE';
    if (token === 'F') return 'FALSE';
    if (token === 'NG') return 'NOT_GIVEN';
  }

  if (questionType === 'YES_NO_NOT_GIVEN') {
    if (token === 'Y') return 'YES';
    if (token === 'N') return 'NO';
    if (token === 'NG') return 'NOT_GIVEN';
  }

  return raw;
}

function normalizeCandidate(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalizeCandidate).filter(Boolean))];
}

function expandSimpleSlash(body: string): string[] | null {
  const slashCount = (body.match(/\//g) ?? []).length;
  if (slashCount === 0) return [body.trim()];
  if (slashCount !== 1) return null;

  const tokens = body.trim().split(/\s+/);
  const slashIndex = tokens.findIndex((token) => token.includes('/'));
  if (slashIndex < 0) return null;

  const parts = tokens[slashIndex]?.split('/') ?? [];
  if (
    parts.length !== 2 ||
    parts.some((part) => !part.trim()) ||
    tokens.some((token, index) => index !== slashIndex && token.includes('/'))
  ) {
    return null;
  }

  return parts.map((part) => {
    const next = [...tokens];
    next[slashIndex] = part;
    return next.join(' ');
  });
}

function expandPercentageAlternatives(body: string): string[] | null {
  const match = body
    .trim()
    .match(/^([^/\s]+)\/(\d+)\s+percent\/per\s+cent\/%$/i);

  if (!match?.[1] || !match[2]) return null;

  const wordNumber = match[1];
  const digits = match[2];
  return [
    `${wordNumber} percent`,
    `${wordNumber} per cent`,
    `${digits} percent`,
    `${digits} per cent`,
    `${digits}%`,
  ];
}

function expandBodyAlternatives(body: string): string[] | null {
  const percentageAlternatives = expandPercentageAlternatives(body);
  if (percentageAlternatives) return percentageAlternatives;

  const spacedAlternatives = body
    .split(/\s+\/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (spacedAlternatives.length <= 1) {
    return expandSimpleSlash(body);
  }

  const expanded: string[] = [];
  for (const alternative of spacedAlternatives) {
    const values = expandSimpleSlash(alternative);
    if (!values) return null;
    expanded.push(...values);
  }
  return expanded;
}

function expandAnswer(raw: string): string[] | null {
  const normalizedRaw = raw.trim();
  const optionalPrefix = normalizedRaw.match(/^\(([^)]+)\)\s+(.+)$/);

  const prefix = optionalPrefix?.[1]?.trim();
  const body = optionalPrefix?.[2]?.trim() ?? normalizedRaw;
  const spacedParts = body.split(/\s+\/\s+/).map((value) => value.trim()).filter(Boolean);
  const bodyAlternatives = expandBodyAlternatives(body);
  if (!bodyAlternatives) return null;

  const values = [...bodyAlternatives];
  if (prefix) {
    const prefixTargets = spacedParts.length > 1
      ? expandSimpleSlash(spacedParts[0] ?? '') ?? []
      : bodyAlternatives;
    for (const value of prefixTargets) {
      values.push(`${prefix} ${value}`);
    }
  }

  return unique(values);
}
export function parseAnswerExpression(input: {
  questionNumber: number;
  raw: string;
  constraints: InstructionConstraints;
  evidence: SourceEvidence[];
  questionType?: ReadingQuestionType;
}): AnswerDefinitionDraft {
  const raw = normalizeEnumeratedAnswer(input.raw, input.questionType).trim();
  const expanded = expandAnswer(raw);

  if (!expanded || expanded.length === 0) {
    return {
      questionNumber: input.questionNumber,
      canonical: [raw],
      alternatives: [],
      normalization: policyFromConstraints(input.constraints),
      sourceEvidence: input.evidence,
      verificationState: 'REVIEW_REQUIRED',
    };
  }

  const [canonical, ...alternatives] = expanded;
  return {
    questionNumber: input.questionNumber,
    canonical: canonical ? [canonical] : [],
    alternatives: alternatives.map((value) => [value]),
    normalization: policyFromConstraints(input.constraints),
    sourceEvidence: input.evidence,
    verificationState: 'VERIFIED',
  };
}
