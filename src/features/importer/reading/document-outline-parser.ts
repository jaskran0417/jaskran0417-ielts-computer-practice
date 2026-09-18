import type {
  PassageMarker,
  ReadingSourcePage,
  StructureReviewItem,
} from './reading-structure';

export interface DocumentOutlineResult {
  passages: PassageMarker[];
  reviewItems: StructureReviewItem[];
}

const PASSAGE_PATTERN = /\bPassage\s+(\d+)\b/gi;
const QUESTION_RANGE_PATTERN = /\bQuestions?\s+\d+\s*[-–—]\s*\d+\b/gi;

function isQuestionInstructionReference(text: string, passageIndex: number): boolean {
  const prefix = text.slice(0, passageIndex);
  const pattern = new RegExp(QUESTION_RANGE_PATTERN.source, QUESTION_RANGE_PATTERN.flags);

  let lastQuestionIndex = -1;
  for (const match of prefix.matchAll(pattern)) {
    lastQuestionIndex = match.index ?? -1;
  }

  return lastQuestionIndex >= 0;
}

function evidenceForPage(page: ReadingSourcePage) {
  return page.evidence.length > 0
    ? page.evidence
    : [
        {
          documentId: page.documentId,
          pageNumber: page.pageNumber,
          method: 'PDF_TEXT' as const,
        },
      ];
}

export function parseDocumentOutline(
  pages: ReadingSourcePage[],
): DocumentOutlineResult {
  const passages: PassageMarker[] = [];

  for (const page of pages) {
    const pattern = new RegExp(PASSAGE_PATTERN.source, PASSAGE_PATTERN.flags);
    for (const match of page.text.matchAll(pattern)) {
      const ordinal = Number(match[1]);
      if (!Number.isSafeInteger(ordinal) || ordinal <= 0) continue;
      if (isQuestionInstructionReference(page.text, match.index ?? 0)) continue;

      passages.push({
        ordinal,
        documentId: page.documentId,
        pageNumber: page.pageNumber,
        matchIndex: match.index ?? 0,
        evidence: evidenceForPage(page),
      });
    }
  }

  passages.sort(
    (left, right) =>
      left.pageNumber - right.pageNumber ||
      left.matchIndex - right.matchIndex,
  );

  const reviewItems: StructureReviewItem[] = [];
  const counts = new Map<number, number>();
  for (const passage of passages) {
    counts.set(passage.ordinal, (counts.get(passage.ordinal) ?? 0) + 1);
  }

  for (const [ordinal, count] of counts) {
    if (count <= 1) continue;
    const matches = passages.filter((passage) => passage.ordinal === ordinal);
    reviewItems.push({
      id: `duplicate-passage-${ordinal}`,
      critical: true,
      reason: `Passage ${ordinal} appears more than once`,
      evidence: matches.flatMap((passage) => passage.evidence),
    });
  }

  return { passages, reviewItems };
}
