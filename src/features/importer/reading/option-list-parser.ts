import type {
  ReadingChoiceOptionDraft,
  ReadingQuestionType,
} from './types';

function alphaRange(start: string, end: string): string[] {
  const first = start.charCodeAt(0);
  const last = end.charCodeAt(0);
  if (first < 65 || last > 90 || first > last) return [];

  return Array.from({ length: last - first + 1 }, (_, index) =>
    String.fromCharCode(first + index),
  );
}

function normalizePdfSpacing(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');
}

function expectedAlphaLabels(instructionText: string): string[] {
  const normalized = normalizePdfSpacing(instructionText).toUpperCase();

  const explicitRange =
    normalized.match(/\b([A-Z])\s*[-–—]\s*([A-Z])\b/) ??
    normalized.match(/\b(?:LETTERS?|PARAGRAPHS?|SECTIONS?)\s+([A-Z])\s*[-–—]\s*([A-Z])\b/);

  if (!explicitRange) return [];
  return alphaRange(explicitRange[1] ?? '', explicitRange[2] ?? '');
}

function appendContinuation(
  options: ReadingChoiceOptionDraft[],
  continuation: string,
): void {
  const previous = options[options.length - 1];
  const text = continuation.trim();
  if (!previous || !text) return;
  previous.label = `${previous.label} ${text}`.replace(/\s+/g, ' ').trim();
}

function parseExpectedAlphaOptions(
  pageText: string,
  expectedLabels: string[],
): ReadingChoiceOptionDraft[] {
  if (expectedLabels.length === 0) return [];

  const expected = new Set(expectedLabels);
  const options: ReadingChoiceOptionDraft[] = [];
  let collecting = false;

  for (const rawLine of pageText.split(/\r?\n/)) {
    const line = normalizePdfSpacing(rawLine).trim();
    if (!line) continue;

    const option = line.match(/^([A-Z])\s*[.)]\s*(.+)$/);
    if (option && expected.has(option[1] ?? '')) {
      const id = option[1] ?? '';
      if (!collecting && id !== expectedLabels[0]) {
        continue;
      }

      collecting = true;
      options.push({ id, label: (option[2] ?? '').trim() });

      if (id === expectedLabels[expectedLabels.length - 1]) {
        break;
      }
      continue;
    }

    if (collecting) {
      if (
        /^Questions?\s+\d+/i.test(line) ||
        /^\d{1,3}[.)]?\s+/.test(line) ||
        /^[A-Z]\s*[.)]\s*/.test(line)
      ) {
        continue;
      }
      appendContinuation(options, line);
    }
  }

  const byId = new Map(options.map((option) => [option.id, option]));
  return expectedLabels.flatMap((label) => {
    const option = byId.get(label);
    return option ? [option] : [];
  });
}

function parseRomanOptions(pageText: string): ReadingChoiceOptionDraft[] {
  const options: ReadingChoiceOptionDraft[] = [];
  let collecting = false;

  for (const rawLine of pageText.split(/\r?\n/)) {
    const line = normalizePdfSpacing(rawLine).trim();
    if (!line) continue;

    if (/^List of Headings\b/i.test(line)) {
      collecting = true;
      continue;
    }

    if (!collecting) continue;

    if (
      /^(?:E\.?\s*g\.?|Example)(?:\s|$)/i.test(line) ||
      /^After you(?:['’])?ve tried\b/i.test(line) ||
      /^Note\s*:/i.test(line)
    ) {
      break;
    }

    const option = line.match(/^([ivxlcdm]+)\s*[.)]?\s+(.+)$/i);
    if (option) {
      options.push({
        id: (option[1] ?? '').toLowerCase(),
        label: (option[2] ?? '').trim(),
      });
      continue;
    }

    if (/^Questions?\s+\d+/i.test(line) || /^\d{1,3}[.)]?\s+/.test(line)) {
      break;
    }

    appendContinuation(options, line);
  }

  return options;
}

function paragraphOptions(instructionText: string): ReadingChoiceOptionDraft[] {
  const normalized = normalizePdfSpacing(instructionText).toUpperCase();
  const match =
    normalized.match(/\bPARAGRAPHS?\s+(?:LABELLED|LABELED)\s*([A-Z])\s*[-–—]\s*([A-Z])\b/) ??
    normalized.match(/\bSECTIONS?\s+(?:LABELLED|LABELED)\s*([A-Z])\s*[-–—]\s*([A-Z])\b/);

  if (!match) return [];

  return alphaRange(match[1] ?? '', match[2] ?? '').map((id) => ({
    id,
    label: `Paragraph ${id}`,
  }));
}

export function parseSharedReadingOptions(input: {
  type: ReadingQuestionType;
  instructionText: string;
  pageText: string;
}): ReadingChoiceOptionDraft[] {
  if (input.type === 'MATCHING_HEADINGS') {
    return parseRomanOptions(input.pageText);
  }

  if (input.type === 'MATCHING_INFORMATION') {
    return paragraphOptions(input.instructionText);
  }

  if (
    input.type === 'MATCHING_SENTENCE_ENDINGS' ||
    input.type === 'MATCHING_FEATURES' ||
    input.type === 'SUMMARY_COMPLETION' ||
    input.type === 'NOTE_COMPLETION' ||
    input.type === 'SENTENCE_COMPLETION' ||
    input.type === 'FLOW_CHART_COMPLETION' ||
    input.type === 'MULTI_SELECT'
  ) {
    return parseExpectedAlphaOptions(
      input.pageText,
      expectedAlphaLabels(input.instructionText),
    );
  }

  return [];
}

function questionStart(line: string, number: number): boolean {
  return new RegExp(`^\\s*${number}[.)]?\\s+`).test(line);
}

function parseQuestionChoiceBlock(
  lines: string[],
  startIndex: number,
  endIndex: number,
): ReadingChoiceOptionDraft[] {
  const options: ReadingChoiceOptionDraft[] = [];

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line) continue;

    const option = line.match(/^([A-D])[.)]\s+(.+)$/);
    if (option) {
      options.push({
        id: option[1] ?? '',
        label: (option[2] ?? '').trim(),
      });
      continue;
    }

    if (options.length > 0 && !/^\d{1,3}[.)]?\s+/.test(line)) {
      appendContinuation(options, line);
    }
  }

  return options;
}

export function parseSingleChoiceOptions(input: {
  startQuestion: number;
  endQuestion: number;
  pageText: string;
}): Record<number, ReadingChoiceOptionDraft[]> {
  const lines = input.pageText.split(/\r?\n/);
  const result: Record<number, ReadingChoiceOptionDraft[]> = {};

  for (
    let questionNumber = input.startQuestion;
    questionNumber <= input.endQuestion;
    questionNumber += 1
  ) {
    const startIndex = lines.findIndex((line) =>
      questionStart(line, questionNumber),
    );
    if (startIndex < 0) continue;

    let endIndex = lines.length;
    for (
      let nextNumber = questionNumber + 1;
      nextNumber <= input.endQuestion;
      nextNumber += 1
    ) {
      const candidate = lines.findIndex(
        (line, index) => index > startIndex && questionStart(line, nextNumber),
      );
      if (candidate >= 0) {
        endIndex = candidate;
        break;
      }
    }

    result[questionNumber] = parseQuestionChoiceBlock(
      lines,
      startIndex,
      endIndex,
    );
  }

  return result;
}
