export interface InstructionConstraints {
  maxWords?: number;
  numbersAllowed?: boolean;
  optionReuse?: 'ONCE' | 'MULTIPLE';
  requiredSelections?: number;
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function parseCount(raw: string): number | undefined {
  const normalized = raw.toUpperCase();
  if (/^\d+$/.test(normalized)) {
    const value = Number(normalized);
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  return NUMBER_WORDS[normalized];
}

export function parseInstructionConstraints(text: string): InstructionConstraints {
  const constraints: InstructionConstraints = {};
  const maxWordsMatch = text.match(
    /NO\s+MORE\s+THAN\s+(ONE|TWO|THREE|FOUR|FIVE|\d+)\s+WORDS?/i,
  );

  if (maxWordsMatch) {
    const maxWords = parseCount(maxWordsMatch[1]);
    if (maxWords !== undefined) {
      constraints.maxWords = maxWords;
      constraints.numbersAllowed = /\bNUMBERS?\b/i.test(text);
    }
  }

  if (/\b(?:can|may)\s+be\s+used\s+more\s+than\s+once\b/i.test(text)) {
    constraints.optionReuse = 'MULTIPLE';
  } else if (
    /\b(?:can|may)\s+be\s+used\s+(?:only\s+)?once\b/i.test(text) ||
    /\buse\s+each\b[^.]*\bonce\b/i.test(text)
  ) {
    constraints.optionReuse = 'ONCE';
  }

  const selectionMatch = text.match(
    /\bchoose\s+(ONE|TWO|THREE|FOUR|FIVE|\d+)\s+(?:letters?|answers?|options?)\b/i,
  );
  if (selectionMatch) {
    const requiredSelections = parseCount(selectionMatch[1]);
    if (requiredSelections !== undefined) {
      constraints.requiredSelections = requiredSelections;
    }
  }

  return constraints;
}
