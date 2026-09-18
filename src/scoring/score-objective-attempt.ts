import type { AnswerDefinitionDraft } from '../features/importer/answers/types';
import {
  normalizeResponse,
  responseExceedsMaxWords,
} from './answer-normalization';

export interface ObjectiveScore {
  rawScore: number;
  totalQuestions: number;
  outcomes: Array<{
    questionId: string;
    correct: boolean;
    ruleViolation?: 'MAX_WORDS';
  }>;
}

function normalizeValues(
  values: string[],
  definition: AnswerDefinitionDraft,
): string[] {
  return values.map((value) =>
    normalizeResponse(value, definition.normalization),
  );
}

function sameValues(
  response: string[],
  expected: string[],
  orderSensitive: boolean,
): boolean {
  if (response.length !== expected.length) return false;

  if (orderSensitive) {
    return response.every((value, index) => value === expected[index]);
  }

  const left = [...response].sort();
  const right = [...expected].sort();
  return left.every((value, index) => value === right[index]);
}

function acceptedGroups(definition: AnswerDefinitionDraft): string[][] {
  return [definition.canonical, ...definition.alternatives].filter(
    (group) => group.length > 0,
  );
}

export function scoreObjectiveAttempt(input: {
  responses: Record<string, string | string[]>;
  definitions: Record<string, AnswerDefinitionDraft>;
}): ObjectiveScore {
  let rawScore = 0;

  const outcomes = Object.entries(input.definitions).map(
    ([questionId, definition]) => {
      const rawResponse = input.responses[questionId];

      if (rawResponse === undefined) {
        return { questionId, correct: false };
      }

      const responseValues = Array.isArray(rawResponse)
        ? rawResponse
        : [rawResponse];

      if (
        responseValues.some((value) =>
          responseExceedsMaxWords(value, definition.normalization),
        )
      ) {
        return {
          questionId,
          correct: false,
          ruleViolation: 'MAX_WORDS' as const,
        };
      }

      const normalizedResponse = normalizeValues(responseValues, definition);
      const orderSensitive = definition.normalization.orderSensitive !== false;
      const correct = acceptedGroups(definition).some((group) =>
        sameValues(
          normalizedResponse,
          normalizeValues(group, definition),
          orderSensitive,
        ),
      );

      if (correct) rawScore += 1;
      return { questionId, correct };
    },
  );

  return {
    rawScore,
    totalQuestions: outcomes.length,
    outcomes,
  };
}
