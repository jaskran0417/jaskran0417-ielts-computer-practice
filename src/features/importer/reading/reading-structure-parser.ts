import { parseReadingDocumentOutline } from './document-outline';
import { parseInstructionConstraints } from './instruction-parser';
import {
  parseSharedReadingOptions,
  parseSingleChoiceOptions,
} from './option-list-parser';
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

function passageTextForBlocks(
  blocks: ReadingSourceBlock[],
  passageNumber: number,
  passageStartPage: number,
  nextPassageStartPage: number,
): string[] {
  const passageBlocks = blocks
    .filter(
      (block) =>
        block.pageNumber >= passageStartPage &&
        block.pageNumber < nextPassageStartPage,
    )
    .sort((left, right) => left.pageNumber - right.pageNumber);

  const result: string[] = [];

  for (const block of passageBlocks) {
    let lines = block.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (block.pageNumber === passageStartPage) {
      const passageIndex = lines.findIndex((line) =>
        new RegExp(`^Passage\\s+${passageNumber}\\b`, 'i').test(line),
      );
      if (passageIndex < 0) continue;
      lines = lines.slice(passageIndex + 2);
    }

    const firstQuestionIndex = lines.findIndex((line) =>
      /^Questions?\s+\d+\s*[-–]\s*\d+/i.test(line),
    );
    if (firstQuestionIndex >= 0) {
      lines = lines.slice(0, firstQuestionIndex);
    }

    result.push(...lines);
  }

  return result;
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
  pageText: string,
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
  const sharedOptions = recognition.type
    ? parseSharedReadingOptions({
        type: recognition.type,
        instructionText: range.instructionText,
        pageText,
      })
    : [];
  const singleChoiceOptions =
    recognition.type === 'SINGLE_CHOICE'
      ? parseSingleChoiceOptions({
          startQuestion: range.start,
          endQuestion: range.end,
          pageText,
        })
      : {};
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

    if (recognition.type === 'SINGLE_CHOICE') {
      question.options = singleChoiceOptions[number] ?? [];
    } else if (
      recognition.type === 'MATCHING_INFORMATION' ||
      recognition.type === 'MATCHING_HEADINGS' ||
      recognition.type === 'MATCHING_FEATURES' ||
      recognition.type === 'MATCHING_SENTENCE_ENDINGS'
    ) {
      question.options = sharedOptions;
      question.allowOptionReuse = /more than once/i.test(range.instructionText);
    }

    if (
      (recognition.type === 'SINGLE_CHOICE' ||
        recognition.type === 'MATCHING_INFORMATION' ||
        recognition.type === 'MATCHING_HEADINGS' ||
        recognition.type === 'MATCHING_FEATURES' ||
        recognition.type === 'MATCHING_SENTENCE_ENDINGS') &&
      (!question.options || question.options.length === 0)
    ) {
      reviewItems.push({
        id: `option-list-${number}`,
        kind: 'OPTION_LIST',
        questionNumber: number,
        message: `Question ${number} options could not be extracted reliably`,
        evidence: range.evidence,
      });
    }

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
        .map((range) => {
          const pageText = input.blocks
            .filter((block) => range.pageNumbers.includes(block.pageNumber))
            .map((block) => block.text)
            .join('\n');
          return buildQuestionGroup(
            range,
            input.visualRegions,
            reviewItems,
            pageText,
          );
        })
        .filter(
          (group): group is ReadingQuestionGroupDraft => group !== null,
        );

      return {
        id: `section-${passage.passageNumber}`,
        passageNumber: passage.passageNumber,
        title: passage.title,
        pageNumbers: passage.pageNumbers,
        passageText: passageTextForBlocks(
          input.blocks,
          passage.passageNumber,
          passageStartPage,
          nextPassageStartPage,
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
