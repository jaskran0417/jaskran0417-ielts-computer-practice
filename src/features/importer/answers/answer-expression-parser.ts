import type { InstructionConstraints } from '../reading/types';
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

function expandAnswer(raw: string): string[] | null {
  const normalizedRaw = raw.trim();
  const optionalPrefix = normalizedRaw.match(/^\(([^)]+)\)\s+(.+)$/);

  const prefix = optionalPrefix?.[1]?.trim();
  const body = optionalPrefix?.[2]?.trim() ?? normalizedRaw;
  const bodyAlternatives = expandSimpleSlash(body);
  if (!bodyAlternatives) return null;

  const values = [...bodyAlternatives];
  if (prefix) {
    for (const value of bodyAlternatives) {
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
}): AnswerDefinitionDraft {
  const raw = input.raw.trim();
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
