import { parseReadingDocumentOutline } from './document-outline';
import { parseInstructionConstraints } from './instruction-parser';
import { recognizeReadingQuestionType } from './question-type-recognizers';
import type {
  ImportedVisualRegion,
  QuestionRangeOutline,
  ReadingQuestionDraft,
  ReadingQuestionGroupDraft,
  ReadingSectionDraft,
  ReadingSourceBlock,
  StructureReviewItem,
  StructuredReadingDraft,
} from './types';

function numberedPrompts(text: string): Map<number, string> {
  const prompts = new Map<number, string>();
  const pattern = /^\s*(\d{1,3})[.)]?\s+(.+?)\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const number = Number(match[1]);
    const prompt = match[2]?.trim();
    if (Number.isInteger(number) && prompt) {
      prompts.set(number, prompt);
    }
  }

  return prompts;
}

function passageTextForBlock(
  block: ReadingSourceBlock | undefined,
  passageNumber: number,
): string[] {
  if (!block) return [];

  const lines = block.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const passageIndex = lines.findIndex((line) =>
    new RegExp(`^Passage\\s+${passageNumber}\\b`, 'i').test(line),
  );

  if (passageIndex < 0) return [];

  return lines.slice(passageIndex + 2);
}

function hasVisual(
  regions: ImportedVisualRegion[],
  range: QuestionRangeOutline,
  kind: ImportedVisualRegion['kind'],
): boolean {
  return regions.some(
    (region) =>
      region.kind === kind && range.pageNumbers.includes(region.pageNumber),
  );
}

function firstVisualId(
  regions: ImportedVisualRegion[],
  range: QuestionRangeOutline,
  kind: ImportedVisualRegion['kind'],
): string | undefined {
  return regions.find(
    (region) =>
      region.kind === kind && range.pageNumbers.includes(region.pageNumber),
  )?.id;
}

function buildQuestionGroup(
  range: QuestionRangeOutline,
  visualRegions: ImportedVisualRegion[],
  reviewItems: StructureReviewItem[],
): ReadingQuestionGroupDraft | null {
  const recognition = recognizeReadingQuestionType({
    instructionText: range.instructionText,
    bodyText: range.instructionText,
    hasDiagram: hasVisual(visualRegions, range, 'DIAGRAM'),
    hasTable: hasVisual(visualRegions, range, 'TABLE'),
  });

  if (!recognition.type) {
    reviewItems.push({
      id: `question-type-${range.start}-${range.end}`,
      kind: 'QUESTION_TYPE',
      message: `Question type for ${range.start}-${range.end} requires review`,
      evidence: range.evidence,
    });
    return null;
  }

  const prompts = numberedPrompts(range.instructionText);
  const constraints = parseInstructionConstraints(range.instructionText);
  const questions: ReadingQuestionDraft[] = [];

  for (let number = range.start; number <= range.end; number += 1) {
    const prompt = prompts.get(number);

    if (!prompt) {
      reviewItems.push({
        id: `question-text-${number}`,
        kind: 'QUESTION_TEXT',
        questionNumber: number,
        message: `Question ${number} text could not be extracted reliably`,
        evidence: range.evidence,
      });
      continue;
    }

    const question: ReadingQuestionDraft = {
      id: `q-${number}`,
      number,
      type: recognition.type,
      prompt,
      instructionConstraints: constraints,
      evidence: range.evidence,
    };

    if (recognition.type === 'DIAGRAM_LABEL_COMPLETION') {
      question.visualRegionId = firstVisualId(
        visualRegions,
        range,
        'DIAGRAM',
      );
    } else if (recognition.type === 'TABLE_COMPLETION') {
      question.visualRegionId = firstVisualId(
        visualRegions,
        range,
        'TABLE',
      );
    }

    questions.push(question);
  }

  return {
    id: `group-${range.start}-${range.end}`,
    startQuestion: range.start,
    endQuestion: range.end,
    type: recognition.type,
    instructionText: range.instructionText,
    instructionConstraints: constraints,
    questions,
    evidence: range.evidence,
  };
}

export function buildStructuredReadingDraft(input: {
  blocks: ReadingSourceBlock[];
  visualRegions: ImportedVisualRegion[];
}): StructuredReadingDraft {
  const outline = parseReadingDocumentOutline(input.blocks);
  const reviewItems: StructureReviewItem[] = outline.issues.map(
    (message, index) => ({
      id: `document-structure-${index + 1}`,
      kind: 'DOCUMENT_STRUCTURE',
      message,
      evidence: [],
    }),
  );

  const sections: ReadingSectionDraft[] = outline.passages.map(
    (passage, passageIndex) => {
      const nextPassage = outline.passages[passageIndex + 1];
      const passageStartPage = Math.min(...passage.pageNumbers);
      const nextPassageStartPage = nextPassage
        ? Math.min(...nextPassage.pageNumbers)
        : Number.POSITIVE_INFINITY;

      const ranges = outline.questionRanges.filter((range) => {
        const rangePage = Math.min(...range.pageNumbers);
        return (
          rangePage >= passageStartPage && rangePage < nextPassageStartPage
        );
      });

      const questionGroups = ranges
        .map((range) =>
          buildQuestionGroup(range, input.visualRegions, reviewItems),
        )
        .filter(
          (group): group is ReadingQuestionGroupDraft => group !== null,
        );

      const passageBlock = input.blocks.find(
        (block) =>
          block.pageNumber === passageStartPage &&
          new RegExp(`^\\s*Passage\\s+${passage.passageNumber}\\b`, 'im').test(
            block.text,
          ),
      );

      return {
        id: `section-${passage.passageNumber}`,
        passageNumber: passage.passageNumber,
        title: passage.title,
        pageNumbers: passage.pageNumbers,
        passageText: passageTextForBlock(
          passageBlock,
          passage.passageNumber,
        ),
        questionGroups,
        evidence: passage.evidence,
      };
    },
  );

  if (sections.length === 0) {
    reviewItems.push({
      id: 'document-structure-no-passages',
      kind: 'DOCUMENT_STRUCTURE',
      message: 'No complete Reading passage structure could be created',
      evidence: input.blocks.flatMap((block) => block.evidence),
    });
  }

  return {
    title: 'Imported Reading Test',
    sections,
    reviewItems,
  };
}
