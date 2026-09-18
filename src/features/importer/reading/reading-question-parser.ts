import type {
  ReadingQuestionType,
  StructureReviewItem,
  StructuredQuestionDraft,
  StructuredQuestionGroupDraft,
  StructuredQuestionOption,
} from './reading-structure';

export interface StructuredQuestionParseResult {
  questions: StructuredQuestionDraft[];
  reviewItems: StructureReviewItem[];
}

interface NumberedSegment {
  number: number;
  text: string;
}

function numberedSegments(sourceText: string): NumberedSegment[] {
  const marker = /(?:^|\s)(\d{1,3})[.)]\s+/g;
  const matches = [...sourceText.matchAll(marker)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? sourceText.length) : sourceText.length;
    return { number: Number(match[1]), text: sourceText.slice(start, end).trim() };
  });
}

function uppercaseOptions(source: string): StructuredQuestionOption[] {
  const options: StructuredQuestionOption[] = [];
  const pattern = /(?:^|\s)([A-Z])[.)]\s+(.+?)(?=(?:\s+[A-Z][.)]\s+)|$)/g;
  for (const match of source.matchAll(pattern)) {
    const id = match[1];
    const label = match[2].trim();
    if (label) options.push({ id, label });
  }
  return options;
}

function romanOptions(source: string): StructuredQuestionOption[] {
  const listIndex = source.search(/\bList\s+of\s+Headings\b/i);
  if (listIndex < 0) return [];
  const list = source.slice(listIndex);
  const options: StructuredQuestionOption[] = [];
  const pattern = /(?:^|\s)(i{1,3}|iv|v|vi{0,3}|ix|x)[.)]\s+(.+?)(?=(?:\s+(?:i{1,3}|iv|v|vi{0,3}|ix|x)[.)]\s+)|$)/gi;
  for (const match of list.matchAll(pattern)) {
    const id = match[1].toLowerCase();
    const label = match[2].trim();
    if (label) options.push({ id, label });
  }
  return options;
}

function labelledRangeOptions(source: string): StructuredQuestionOption[] {
  const match = source.match(/\blabelled\s+([A-Z])\s*[-–—]\s*([A-Z])\b/i);
  if (!match) return [];
  const start = match[1].toUpperCase().charCodeAt(0);
  const end = match[2].toUpperCase().charCodeAt(0);
  if (end < start || end - start > 25) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const id = String.fromCharCode(start + index);
    return { id, label: id };
  });
}

function sharedOptions(
  type: ReadingQuestionType,
  pageText: string,
): StructuredQuestionOption[] {
  if (type === 'MATCHING_HEADINGS') return romanOptions(pageText);
  if (type === 'MATCHING_INFORMATION') return labelledRangeOptions(pageText);

  if (type === 'MATCHING_FEATURES' || type === 'MATCHING_SENTENCE_ENDINGS') {
    const listIndex = pageText.search(/\bList\s+of\b/i);
    const source = listIndex >= 0 ? pageText.slice(listIndex) : pageText;
    return uppercaseOptions(source);
  }
  return [];
}

function splitPromptAndOptions(segment: string): {
  prompt: string;
  options: StructuredQuestionOption[];
} {
  const firstOption = segment.search(/(?:^|\s)A[.)]\s+/);
  if (firstOption < 0) return { prompt: segment.trim(), options: [] };
  return {
    prompt: segment.slice(0, firstOption).trim(),
    options: uppercaseOptions(segment.slice(firstOption)),
  };
}

function fallbackPrompt(type: ReadingQuestionType, number: number): string {
  if (type === 'DIAGRAM_LABEL_COMPLETION') return `Diagram label ${number}`;
  if (type === 'TABLE_COMPLETION') return `Table blank ${number}`;
  if (type === 'FLOW_CHART_COMPLETION') return `Flow-chart blank ${number}`;
  return `Question ${number}`;
}

export function parseStructuredQuestionGroup(
  group: StructuredQuestionGroupDraft,
  pageText = group.sourceText,
): StructuredQuestionParseResult {
  const reviewItems: StructureReviewItem[] = [];
  if (!group.questionType) {
    return {
      questions: [],
      reviewItems: [{
        id: `question-type-${group.range[0]}-${group.range[1]}`,
        critical: true,
        reason: `Question type for Questions ${group.range[0]}-${group.range[1]} requires review`,
        evidence: group.evidence,
      }],
    };
  }

  const segments = new Map(
    numberedSegments(group.sourceText)
      .filter((segment) => segment.number >= group.range[0] && segment.number <= group.range[1])
      .map((segment) => [segment.number, segment]),
  );
  const shared = sharedOptions(group.questionType, pageText);
  const questions: StructuredQuestionDraft[] = [];

  for (let number = group.range[0]; number <= group.range[1]; number += 1) {
    const segment = segments.get(number);
    let prompt = segment?.text ?? '';
    let options: StructuredQuestionOption[] | undefined;

    if (group.questionType === 'SINGLE_CHOICE' || group.questionType === 'MULTI_SELECT') {
      const split = splitPromptAndOptions(prompt);
      prompt = split.prompt;
      options = split.options;
    } else if (
      group.questionType === 'MATCHING_INFORMATION' ||
      group.questionType === 'MATCHING_HEADINGS' ||
      group.questionType === 'MATCHING_FEATURES' ||
      group.questionType === 'MATCHING_SENTENCE_ENDINGS'
    ) {
      const listIndex = prompt.search(/\bList\s+of\b/i);
      if (listIndex >= 0) prompt = prompt.slice(0, listIndex).trim();
      options = shared;
    }

    if (!prompt) {
      prompt = fallbackPrompt(group.questionType, number);
      reviewItems.push({
        id: `question-prompt-${number}`,
        critical: true,
        reason:
          group.questionType === 'DIAGRAM_LABEL_COMPLETION'
            ? `Question ${number} visual label requires source anchor confirmation`
            : `Question ${number} prompt could not be extracted reliably`,
        evidence: group.evidence,
      });
    }

    if (
      (group.questionType === 'SINGLE_CHOICE' ||
        group.questionType === 'MULTI_SELECT' ||
        group.questionType === 'MATCHING_INFORMATION' ||
        group.questionType === 'MATCHING_HEADINGS' ||
        group.questionType === 'MATCHING_FEATURES' ||
        group.questionType === 'MATCHING_SENTENCE_ENDINGS') &&
      (!options || options.length === 0)
    ) {
      reviewItems.push({
        id: `question-options-${number}`,
        critical: true,
        reason: `Question ${number} option list could not be extracted reliably`,
        evidence: group.evidence,
      });
    }

    questions.push({
      id: `q${number}`,
      number,
      questionType: group.questionType,
      prompt,
      ...(options ? { options } : {}),
      ...(group.instructionConstraints ? { constraints: group.instructionConstraints } : {}),
      evidence: group.evidence,
    });
  }

  return { questions, reviewItems };
}
