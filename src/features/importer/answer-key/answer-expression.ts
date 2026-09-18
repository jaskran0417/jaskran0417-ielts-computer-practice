export interface ExpandedAnswerExpression {
  state: 'VERIFIED' | 'REVIEW_REQUIRED';
  accepted: string[];
  reasons: string[];
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function expandSingleSlash(value: string): string[] | null {
  const match = value.match(/^(.*?)([^\s/]+)\/([^\s/]+)(.*)$/);
  if (!match) return null;

  const [, prefix, left, right, suffix] = match;
  if (!left || !right || left.includes('/') || right.includes('/')) return null;

  return [
    normalize(`${prefix}${left}${suffix}`),
    normalize(`${prefix}${right}${suffix}`),
  ];
}

export function expandAnswerExpression(raw: string): ExpandedAnswerExpression {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return {
      state: 'REVIEW_REQUIRED',
      accepted: [],
      reasons: ['Answer expression is empty'],
    };
  }

  const slashCount = (trimmed.match(/\//g) ?? []).length;
  if (slashCount > 1) {
    return {
      state: 'REVIEW_REQUIRED',
      accepted: [],
      reasons: ['Answer expression contains ambiguous chained slash alternatives'],
    };
  }

  const optionalMatches = [...trimmed.matchAll(/\(([^()]+)\)/g)];
  if (optionalMatches.length > 1) {
    return {
      state: 'REVIEW_REQUIRED',
      accepted: [],
      reasons: ['Answer expression contains multiple optional groups'],
    };
  }

  let variants: string[];
  if (optionalMatches.length === 1) {
    const full = optionalMatches[0][0];
    const optional = optionalMatches[0][1].trim();
    variants = [
      trimmed.replace(full, ''),
      trimmed.replace(full, optional),
    ];
  } else {
    variants = [trimmed];
  }

  const expanded: string[] = [];
  for (const variant of variants) {
    if (slashCount === 0) {
      expanded.push(normalize(variant));
      continue;
    }

    const slashVariants = expandSingleSlash(variant);
    if (!slashVariants) {
      return {
        state: 'REVIEW_REQUIRED',
        accepted: [],
        reasons: ['Answer slash notation could not be expanded unambiguously'],
      };
    }
    expanded.push(...slashVariants);
  }

  return {
    state: 'VERIFIED',
    accepted: unique(expanded),
    reasons: [],
  };
}
