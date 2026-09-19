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

function isRepeatedReadingPageFurniture(line: string): boolean {
  return (
    /^IELTS Advantage Practice Reading Test\s*\d*$/i.test(line) ||
    /^Computer Test Practice$/i.test(line)
  );
}

function isPracticeFooterStart(line: string): boolean {
  return (
    /^Note:\s*This is not a real IELTS test\b/i.test(line) ||
    /^After you(?:['’])?ve tried these questions\b/i.test(line)
  );
}

function cleanPassagePageLines(lines: string[]): string[] {
  const cleaned: string[] = [];

  for (const line of lines) {
    if (isRepeatedReadingPageFurniture(line)) continue;
    if (isPracticeFooterStart(line)) break;
    cleaned.push(line);
  }

  return cleaned;
}

function numberedPrompts(
  text: string,
  startQuestion: number,
  endQuestion: number,
): Map<number, string> {
  const prompts = new Map<number, string>();
  let current: number | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(?:Questions?\s+\d|[A-Z]\s*[.)]|List of Headings|E\.?g\.?\s|Example\b)/i.test(line)
      || isPracticeFooterStart(line)) {
      current = null;
      continue;
    }

    const leading = line.match(/^(\d{1,3})[.)]?\s+(.+?)\s*$/);
    if (leading) {
      const number = Number(leading[1]);
      const prompt = leading[2]?.trim();
      if (
        Number.isInteger(number) &&
        number >= startQuestion &&
        number <= endQuestion &&
        prompt
      ) {
        prompts.set(number, prompt);
        current = number;
        continue;
      }
    }

    let foundEmbedded = false;
    for (let number = startQuestion; number <= endQuestion; number += 1) {
      if (prompts.has(number)) continue;
      const embedded = line.match(
        new RegExp(`(?:^|\\s)${number}[.)]\\s*(.+?)\\s*$`),
      );
      const prompt = embedded?.[1]?.trim();
      if (prompt) {
        prompts.set(number, prompt);
        current = number;
        foundEmbedded = true;
      }
    }
    if (!foundEmbedded && current !== null) {
      prompts.set(current, `${prompts.get(current)} ${line}`);
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
      .map((line) => line.trim());

    if (block.pageNumber === passageStartPage) {
      const passageIndex = lines.findIndex((line) =>
        new RegExp(`^Passage\\s+${passageNumber}\\b`, 'i').test(line),
      );
      if (passageIndex < 0) continue;
      const titleIndex = lines.findIndex((line, index) => index > passageIndex && line.length > 0);
      lines = lines.slice(titleIndex + 1);
    }

    const firstQuestionIndex = lines.findIndex((line) =>
      /^Questions?\s+\d+\s*[-–]\s*\d+/i.test(line),
    );
    if (firstQuestionIndex >= 0) {
      lines = lines.slice(0, firstQuestionIndex);
    }

    const cleaned = cleanPassagePageLines(lines);
    const paragraphs = cleaned.some(line => !line)
      ? cleaned.join('\n').split(/\n\s*\n/).map(text => text.replace(/\n/g, ' ').trim()).filter(Boolean)
      : cleaned.filter(Boolean);
    // Join a sentence continued across a physical PDF page boundary.
    const previous = result[result.length - 1];
    if (previous && paragraphs[0] && !/[.!?:]["'”’)]?$/.test(previous) && /^[a-z]/.test(paragraphs[0])) {
      result[result.length - 1] = `${previous} ${paragraphs.shift()}`;
    }
    result.push(...paragraphs);
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

  const prompts = numberedPrompts(range.instructionText, range.start, range.end);
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
    const prompt =
      prompts.get(number) ??
      (recognition.type === 'DIAGRAM_LABEL_COMPLETION' ? `Label ${number}` : undefined);

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
    } else if (sharedOptions.length > 0) {
      question.options = sharedOptions;
    }

    if (
      (recognition.type === 'SINGLE_CHOICE' ||
        recognition.type === 'MATCHING_INFORMATION' ||
        recognition.type === 'MATCHING_HEADINGS' ||
        recognition.type === 'MATCHING_FEATURES' ||
        recognition.type === 'MATCHING_SENTENCE_ENDINGS' ||
        (['SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'SENTENCE_COMPLETION', 'FLOW_CHART_COMPLETION'].includes(recognition.type)
          && /\b(?:box|list)\b/i.test(range.instructionText))) &&
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
