import type { PassageHighlight } from '../../exam-engine/types';

export interface NormalizedPassageRange {
  startOffset: number;
  endOffset: number;
}

export interface PassageSegment {
  text: string;
  highlighted: boolean;
  highlightIds: string[];
}

export function normalizePassageRange(
  range: Pick<PassageHighlight, 'startOffset' | 'endOffset'>,
  paragraphLength: number,
): NormalizedPassageRange | null {
  const limit = Math.max(0, paragraphLength);
  const startOffset = Math.min(limit, Math.max(0, range.startOffset));
  const endOffset = Math.min(limit, Math.max(0, range.endOffset));

  if (endOffset <= startOffset) {
    return null;
  }

  return { startOffset, endOffset };
}

export function segmentsForParagraph(
  text: string,
  highlights: PassageHighlight[],
): PassageSegment[] {
  if (text.length === 0) {
    return [];
  }

  const normalized = highlights
    .map((highlight) => {
      const range = normalizePassageRange(highlight, text.length);
      return range ? { ...highlight, ...range } : null;
    })
    .filter((value): value is PassageHighlight => value !== null);

  if (normalized.length === 0) {
    return [{ text, highlighted: false, highlightIds: [] }];
  }

  const boundaries = new Set<number>([0, text.length]);
  for (const highlight of normalized) {
    boundaries.add(highlight.startOffset);
    boundaries.add(highlight.endOffset);
  }

  const ordered = [...boundaries].sort((a, b) => a - b);
  const segments: PassageSegment[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index]!;
    const end = ordered[index + 1]!;
    if (end <= start) continue;

    const highlightIds = normalized
      .filter(
        (highlight) =>
          highlight.startOffset < end && highlight.endOffset > start,
      )
      .map((highlight) => highlight.id)
      .sort();

    segments.push({
      text: text.slice(start, end),
      highlighted: highlightIds.length > 0,
      highlightIds,
    });
  }

  return segments;
}
