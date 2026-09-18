import type { StudentQuestion } from '../../../test-schema/types';
import type { SourceEvidence, VerificationState } from '../domain';
import type { AnswerDefinition, AnswerNormalizationPolicy } from '../../../scoring/answer-definition';
import { expandAnswerExpression } from './answer-expression';

export interface AnswerMappingEntry {
  questionNumber: number;
  raw: string;
  evidence: SourceEvidence[];
  verificationState: VerificationState;
}

export interface AnswerDefinitionMapping {
  definitions: Record<string, AnswerDefinition>;
  unmappedQuestionNumbers: number[];
  duplicateQuestionNumbers: number[];
  unusedAnswerNumbers: number[];
  reviewQuestionNumbers: number[];
  publicationReady: boolean;
}

function policyFor(question: StudentQuestion): AnswerNormalizationPolicy {
  return {
    caseSensitive: false,
    collapseWhitespace: true,
    punctuation: 'LENIENT',
    ...(question.constraints?.maxWords !== undefined
      ? { maxWords: question.constraints.maxWords }
      : {}),
    ...(question.constraints?.numbersAllowed !== undefined
      ? { numbersAllowed: question.constraints.numbersAllowed }
      : {}),
    orderSensitive: question.type === 'MULTI_SELECT',
  };
}

function enumValue(
  raw: string,
  type: StudentQuestion['type'],
): 'TRUE' | 'FALSE' | 'NOT_GIVEN' | 'YES' | 'NO' | null {
  const value = raw.trim().toUpperCase().replace(/[.]/g, '');
  if (type === 'TRUE_FALSE_NOT_GIVEN') {
    if (value === 'T' || value === 'TRUE') return 'TRUE';
    if (value === 'F' || value === 'FALSE') return 'FALSE';
    if (value === 'NG' || value === 'NOT GIVEN' || value === 'NOT_GIVEN') return 'NOT_GIVEN';
  }
  if (type === 'YES_NO_NOT_GIVEN') {
    if (value === 'Y' || value === 'YES') return 'YES';
    if (value === 'N' || value === 'NO') return 'NO';
    if (value === 'NG' || value === 'NOT GIVEN' || value === 'NOT_GIVEN') return 'NOT_GIVEN';
  }
  return null;
}

function isOptionQuestion(type: StudentQuestion['type']): boolean {
  return (
    type === 'SINGLE_CHOICE' ||
    type === 'MULTI_SELECT' ||
    type === 'MATCHING_INFORMATION' ||
    type === 'MATCHING_HEADINGS' ||
    type === 'MATCHING_FEATURES' ||
    type === 'MATCHING_SENTENCE_ENDINGS'
  );
}

function buildDefinition(
  question: StudentQuestion,
  entry: AnswerMappingEntry,
): AnswerDefinition | null {
  const base = {
    questionId: question.id,
    policy: policyFor(question),
    sourceEvidence: entry.evidence,
    verificationState: entry.verificationState,
  };

  if (question.type === 'TRUE_FALSE_NOT_GIVEN' || question.type === 'YES_NO_NOT_GIVEN') {
    const accepted = enumValue(entry.raw, question.type);
    if (!accepted || entry.verificationState === 'REVIEW_REQUIRED' || entry.verificationState === 'UNREADABLE') {
      return null;
    }
    return { ...base, kind: 'ENUM', accepted: [accepted] };
  }

  if (isOptionQuestion(question.type)) {
    const rawIds = entry.raw
      .split(/[,+]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (rawIds.length === 0 || entry.verificationState === 'REVIEW_REQUIRED' || entry.verificationState === 'UNREADABLE') {
      return null;
    }
    return { ...base, kind: 'OPTION', acceptedOptionIds: rawIds };
  }

  const expanded = expandAnswerExpression(entry.raw);
  if (
    expanded.state !== 'VERIFIED' ||
    entry.verificationState === 'REVIEW_REQUIRED' ||
    entry.verificationState === 'UNREADABLE'
  ) {
    return null;
  }

  return { ...base, kind: 'TEXT', accepted: expanded.accepted };
}

export function mapAnswerDefinitions(
  questions: StudentQuestion[],
  entries: AnswerMappingEntry[],
): AnswerDefinitionMapping {
  const questionByNumber = new Map<number, StudentQuestion>();
  const duplicateQuestionNumbers = new Set<number>();

  for (const question of questions) {
    if (questionByNumber.has(question.number)) duplicateQuestionNumbers.add(question.number);
    else questionByNumber.set(question.number, question);
  }

  const entriesByNumber = new Map<number, AnswerMappingEntry[]>();
  for (const entry of entries) {
    const current = entriesByNumber.get(entry.questionNumber) ?? [];
    current.push(entry);
    entriesByNumber.set(entry.questionNumber, current);
  }

  for (const [number, matches] of entriesByNumber) {
    if (matches.length > 1) duplicateQuestionNumbers.add(number);
  }

  const definitions: Record<string, AnswerDefinition> = {};
  const unmappedQuestionNumbers: number[] = [];
  const reviewQuestionNumbers: number[] = [];

  for (const [questionNumber, question] of questionByNumber) {
    const matches = entriesByNumber.get(questionNumber) ?? [];
    if (matches.length !== 1) {
      unmappedQuestionNumbers.push(questionNumber);
      continue;
    }

    const definition = buildDefinition(question, matches[0]);
    if (!definition) {
      reviewQuestionNumbers.push(questionNumber);
      continue;
    }
    definitions[question.id] = definition;
  }

  const unusedAnswerNumbers = [...entriesByNumber.keys()]
    .filter((number) => !questionByNumber.has(number))
    .sort((a, b) => a - b);

  const duplicateNumbers = [...duplicateQuestionNumbers].sort((a, b) => a - b);
  unmappedQuestionNumbers.sort((a, b) => a - b);
  reviewQuestionNumbers.sort((a, b) => a - b);

  return {
    definitions,
    unmappedQuestionNumbers,
    duplicateQuestionNumbers: duplicateNumbers,
    unusedAnswerNumbers,
    reviewQuestionNumbers,
    publicationReady:
      unmappedQuestionNumbers.length === 0 &&
      duplicateNumbers.length === 0 &&
      unusedAnswerNumbers.length === 0 &&
      reviewQuestionNumbers.length === 0 &&
      Object.keys(definitions).length === questionByNumber.size,
  };
}
