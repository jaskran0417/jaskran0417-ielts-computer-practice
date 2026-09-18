import { parseDocumentOutline } from './document-outline-parser';
import { parseQuestionRanges } from './question-range-parser';
import { parseInstructionConstraints } from './instruction-parser';
import { recognizeQuestionType } from './question-type-recognizer';
import { parseStructuredQuestionGroup } from './reading-question-parser';
import type {
  PassageMarker,
  QuestionRangeMarker,
  ReadingSourcePage,
  StructureReviewItem,
  StructuredReadingDraft,
  StructuredReadingSectionDraft,
  StructuredQuestionGroupDraft,
} from './reading-structure';

const FIRST_QUESTION_PATTERN = /\bQuestions?\s+\d+\s*[-–—]\s*\d+\b/i;

function pagePosition(pageNumber: number, matchIndex: number): number {
  return pageNumber * 1_000_000 + matchIndex;
}

function sourceTextForPassage(
  pages: ReadingSourcePage[],
  marker: PassageMarker,
  nextMarker: PassageMarker | undefined,
): string[] {
  const markerPosition = pagePosition(marker.pageNumber, marker.matchIndex);
  const nextPosition = nextMarker
    ? pagePosition(nextMarker.pageNumber, nextMarker.matchIndex)
    : Number.POSITIVE_INFINITY;

  const chunks: string[] = [];

  for (const page of pages) {
    const pageStart = pagePosition(page.pageNumber, 0);
    const pageEnd = pagePosition(page.pageNumber, page.text.length);

    if (pageEnd <= markerPosition || pageStart >= nextPosition) continue;

    let text = page.text;

    if (page.pageNumber === marker.pageNumber) {
      text = text.slice(marker.matchIndex);
    }

    if (nextMarker && page.pageNumber === nextMarker.pageNumber) {
      text = text.slice(0, nextMarker.matchIndex);
    }

    const questionIndex = text.search(FIRST_QUESTION_PATTERN);
    if (questionIndex >= 0) {
      text = text.slice(0, questionIndex);
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized) chunks.push(normalized);
  }

  return chunks;
}

function reviewQuestionNumbering(
  ranges: QuestionRangeMarker[],
): StructureReviewItem[] {
  const reviewItems: StructureReviewItem[] = [];
  const numericOrder = [...ranges].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );

  for (let index = 1; index < numericOrder.length; index += 1) {
    const previous = numericOrder[index - 1];
    const current = numericOrder[index];

    if (current.start > previous.end + 1) {
      reviewItems.push({
        id: `question-gap-${previous.end}-${current.start}`,
        critical: true,
        reason: `Question numbering gap between ${previous.end} and ${current.start}`,
        evidence: [...previous.evidence, ...current.evidence],
      });
    } else if (current.start <= previous.end) {
      reviewItems.push({
        id: `question-overlap-${current.start}`,
        critical: true,
        reason: `Question numbering overlaps at ${current.start}`,
        evidence: [...previous.evidence, ...current.evidence],
      });
    }
  }

  return reviewItems;
}

function sectionForRange(
  sections: StructuredReadingSectionDraft[],
  passages: PassageMarker[],
  range: QuestionRangeMarker,
): StructuredReadingSectionDraft | undefined {
  const rangePosition = pagePosition(range.pageNumber, range.matchIndex);
  let bestIndex = -1;

  passages.forEach((passage, index) => {
    if (
      pagePosition(passage.pageNumber, passage.matchIndex) <= rangePosition
    ) {
      bestIndex = index;
    }
  });

  return bestIndex >= 0 ? sections[bestIndex] : undefined;
}

export function parseReadingStructure(
  inputPages: ReadingSourcePage[],
): StructuredReadingDraft {
  const pages = [...inputPages].sort(
    (left, right) => left.pageNumber - right.pageNumber,
  );
  const outline = parseDocumentOutline(pages);
  const questionRanges = parseQuestionRanges(pages);
  const reviewItems: StructureReviewItem[] = [
    ...outline.reviewItems,
    ...reviewQuestionNumbering(questionRanges),
  ];

  const sections: StructuredReadingSectionDraft[] = outline.passages.map(
    (passage, index) => ({
      id: `passage-${passage.ordinal}`,
      ordinal: passage.ordinal,
      title: `Passage ${passage.ordinal}`,
      passageText: sourceTextForPassage(
        pages,
        passage,
        outline.passages[index + 1],
      ),
      questionGroups: [],
      evidence: passage.evidence,
    }),
  );

  for (const range of questionRanges) {
    const section = sectionForRange(sections, outline.passages, range);
    if (!section) {
      reviewItems.push({
        id: `orphan-question-range-${range.start}-${range.end}`,
        critical: true,
        reason: `Questions ${range.start}-${range.end} appear before any Passage marker`,
        evidence: range.evidence,
      });
      continue;
    }

    const recognition = recognizeQuestionType(range.sourceText);
    const group: StructuredQuestionGroupDraft = {
      id: `questions-${range.start}-${range.end}`,
      range: [range.start, range.end] as const,
      pageNumber: range.pageNumber,
      sourceText: range.sourceText,
      questionType: recognition.type,
      instructionConstraints: parseInstructionConstraints(range.sourceText),
      questions: [],
      evidence: range.evidence,
    };

    const sourcePage = pages.find((page) => page.pageNumber === range.pageNumber);
    const parsedQuestions = parseStructuredQuestionGroup(group, sourcePage?.text ?? range.sourceText);
    group.questions = parsedQuestions.questions;
    reviewItems.push(...parsedQuestions.reviewItems);

    section.questionGroups.push(group);
  }

  return {
    module: 'READING',
    title: 'Imported Reading Test',
    sections,
    reviewItems,
  };
}
