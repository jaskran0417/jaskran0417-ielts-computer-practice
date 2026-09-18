import type {
  PassageOutline,
  QuestionRangeOutline,
  ReadingDocumentOutline,
  ReadingSourceBlock,
} from './types';

const PASSAGE_HEADING = /^\s*Passage\s+(\d+)\s*$/im;
const QUESTION_RANGE = /Questions?\s+(\d+)\s*[-–]\s*(\d+)/gi;

function passageTitle(text: string, passageNumber: number): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headingIndex = lines.findIndex((line) =>
    new RegExp(`^Passage\\s+${passageNumber}\\s*$`, 'i').test(line),
  );

  if (headingIndex < 0) return null;

  const candidate = lines[headingIndex + 1];
  if (!candidate || /^Questions?\b/i.test(candidate)) return null;
  return candidate;
}

function uniqueSorted(numbers: number[]): number[] {
  return [...new Set(numbers)].sort((left, right) => left - right);
}

function collectPassages(blocks: ReadingSourceBlock[], issues: string[]): PassageOutline[] {
  const passages: PassageOutline[] = [];

  for (const block of blocks) {
    const match = block.text.match(PASSAGE_HEADING);
    if (!match) continue;

    const passageNumber = Number(match[1]);
    const existing = passages.find((passage) => passage.passageNumber === passageNumber);

    if (existing) {
      existing.pageNumbers = uniqueSorted([...existing.pageNumbers, block.pageNumber]);
      existing.evidence = [...existing.evidence, ...block.evidence];
      if (!existing.title) {
        existing.title = passageTitle(block.text, passageNumber);
      }
      continue;
    }

    passages.push({
      passageNumber,
      title: passageTitle(block.text, passageNumber),
      pageNumbers: [block.pageNumber],
      evidence: [...block.evidence],
    });
  }

  passages.sort((left, right) => left.passageNumber - right.passageNumber);

  for (let index = 1; index < passages.length; index += 1) {
    const previous = passages[index - 1];
    const current = passages[index];
    if (
      previous &&
      current &&
      current.passageNumber !== previous.passageNumber + 1
    ) {
      issues.push(
        `Passage numbering is not continuous: ${previous.passageNumber} then ${current.passageNumber}`,
      );
    }
  }

  return passages;
}

function collectQuestionRanges(
  blocks: ReadingSourceBlock[],
  issues: string[],
): QuestionRangeOutline[] {
  const ranges: QuestionRangeOutline[] = [];

  for (const block of blocks) {
    QUESTION_RANGE.lastIndex = 0;
    const matches = [...block.text.matchAll(QUESTION_RANGE)];

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const start = Number(match?.[1]);
      const end = Number(match?.[2]);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start <= 0 ||
        end < start
      ) {
        issues.push(`Invalid question range on page ${block.pageNumber}`);
        continue;
      }

      const segmentStart = match?.index ?? 0;
      const segmentEnd = matches[index + 1]?.index ?? block.text.length;

      ranges.push({
        start,
        end,
        pageNumbers: [block.pageNumber],
        instructionText: block.text.slice(segmentStart, segmentEnd).trim(),
        evidence: [...block.evidence],
      });
    }
  }

  ranges.sort((left, right) => left.start - right.start || left.end - right.end);

  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];

    if (previous && current && current.start <= previous.end) {
      issues.push(
        `Question ranges overlap: ${previous.start}-${previous.end} and ${current.start}-${current.end}`,
      );
    }
  }

  return ranges;
}

export function parseReadingDocumentOutline(
  blocks: ReadingSourceBlock[],
): ReadingDocumentOutline {
  const issues: string[] = [];

  return {
    passages: collectPassages(blocks, issues),
    questionRanges: collectQuestionRanges(blocks, issues),
    issues,
  };
}
