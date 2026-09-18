import type { InstructionConstraints } from './types';

const WORD_COUNTS: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function wordCount(token: string | undefined): number | undefined {
  if (!token) return undefined;
  return WORD_COUNTS[token.toUpperCase()];
}

export function parseInstructionConstraints(
  text: string,
): InstructionConstraints {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ').trim();

  const noMoreThan = normalized.match(
    /NO MORE THAN\s+(ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?/,
  );
  const exactOnly = normalized.match(
    /\b(ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?\s+ONLY\b/,
  );

  const maxWords = wordCount(noMoreThan?.[1] ?? exactOnly?.[1]);

  if (maxWords === undefined) {
    return {};
  }

  return {
    maxWords,
    numbersAllowed: /\bNUMBERS?\b/.test(normalized),
  };
}
