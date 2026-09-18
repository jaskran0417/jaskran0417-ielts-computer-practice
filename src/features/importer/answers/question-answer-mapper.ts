import type { ReadingQuestionDraft } from '../reading/types';
import { parseAnswerExpression } from './answer-expression-parser';
import type { AnswerDefinitionDraft, ParsedAnswerEntry } from './types';

export interface AnswerCoverageResult {
  definitions: Record<string, AnswerDefinitionDraft>;
  missingQuestionNumbers: number[];
  duplicateQuestionNumbers: number[];
  unmappedAnswerNumbers: number[];
  blockingReasons: string[];
}

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function mapAnswersToQuestions(input: {
  questions: ReadingQuestionDraft[];
  answerEntries: ParsedAnswerEntry[];
}): AnswerCoverageResult {
  const questionsByNumber = new Map(
    input.questions.map((question) => [question.number, question]),
  );
  const entriesByNumber = new Map<number, ParsedAnswerEntry[]>();

  for (const entry of input.answerEntries) {
    const current = entriesByNumber.get(entry.questionNumber) ?? [];
    current.push(entry);
    entriesByNumber.set(entry.questionNumber, current);
  }

  const duplicateQuestionNumbers = sortedUnique(
    [...entriesByNumber.entries()]
      .filter(([, entries]) => entries.length > 1)
      .map(([number]) => number),
  );

  const missingQuestionNumbers = sortedUnique(
    input.questions
      .filter((question) => !entriesByNumber.has(question.number))
      .map((question) => question.number),
  );

  const unmappedAnswerNumbers = sortedUnique(
    input.answerEntries
      .filter((entry) => !questionsByNumber.has(entry.questionNumber))
      .map((entry) => entry.questionNumber),
  );

  const definitions: Record<string, AnswerDefinitionDraft> = {};

  for (const question of input.questions) {
    const entries = entriesByNumber.get(question.number);
    if (!entries || entries.length !== 1) continue;

    const entry = entries[0];
    definitions[question.id] = parseAnswerExpression({
      questionNumber: question.number,
      raw: entry.raw,
      constraints: entry.constraints,
      evidence: entry.evidence,
    });
  }

  const blockingReasons: string[] = [];
  if (missingQuestionNumbers.length > 0) {
    blockingReasons.push(
      `Missing answers for questions: ${missingQuestionNumbers.join(', ')}`,
    );
  }
  if (duplicateQuestionNumbers.length > 0) {
    blockingReasons.push(
      `Duplicate answers for questions: ${duplicateQuestionNumbers.join(', ')}`,
    );
  }
  if (unmappedAnswerNumbers.length > 0) {
    blockingReasons.push(
      `Answers do not map to questions: ${unmappedAnswerNumbers.join(', ')}`,
    );
  }

  return {
    definitions,
    missingQuestionNumbers,
    duplicateQuestionNumbers,
    unmappedAnswerNumbers,
    blockingReasons,
  };
}
