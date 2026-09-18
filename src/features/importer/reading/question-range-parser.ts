import type {
  QuestionRangeMarker,
  ReadingSourcePage,
} from './reading-structure';

const QUESTION_RANGE_PATTERN = /\bQuestions?\s+(\d+)\s*[-–—]\s*(\d+)\b/gi;

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

export function parseQuestionRanges(
  pages: ReadingSourcePage[],
): QuestionRangeMarker[] {
  const result: QuestionRangeMarker[] = [];

  for (const page of pages) {
    const pattern = new RegExp(
      QUESTION_RANGE_PATTERN.source,
      QUESTION_RANGE_PATTERN.flags,
    );
    const matches = [...page.text.matchAll(pattern)];

    matches.forEach((match, index) => {
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start <= 0 ||
        end < start
      ) {
        return;
      }

      const matchIndex = match.index ?? 0;
      const nextIndex =
        index + 1 < matches.length
          ? (matches[index + 1].index ?? page.text.length)
          : page.text.length;

      result.push({
        start,
        end,
        documentId: page.documentId,
        pageNumber: page.pageNumber,
        matchIndex,
        sourceText: page.text.slice(matchIndex, nextIndex).trim(),
        evidence: evidenceForPage(page),
      });
    });
  }

  return result.sort(
    (left, right) =>
      left.pageNumber - right.pageNumber ||
      left.matchIndex - right.matchIndex,
  );
}
