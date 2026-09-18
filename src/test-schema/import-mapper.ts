import type { ImportDraft } from '../features/importer/local/import-repository';
import type { StudentTestPackage } from './types';

export type ProtectedAnswers = Readonly<Record<string, string>>;

export type ImportPublicationResult =
  | {
      ok: true;
      studentPackage: StudentTestPackage;
      protectedAnswers: ProtectedAnswers;
    }
  | {
      ok: false;
      blockingFieldIds: string[];
      reasons: string[];
    };

const PROTECTED_STUDENT_KEYS = new Set([
  'correctAnswer',
  'correctAnswers',
  'answerKey',
  'answerKeys',
  'answerDefinitions',
  'protectedAnswers',
  'accepted',
  'acceptedOptionIds',
  'canonical',
]);

export function containsProtectedAnswerData(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsProtectedAnswerData);
  }

  if (value === null || typeof value !== 'object') {
    return false;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PROTECTED_STUDENT_KEYS.has(key)) {
      return true;
    }

    if (containsProtectedAnswerData(child)) {
      return true;
    }
  }

  return false;
}

function unresolvedCriticalFieldIds(draft: ImportDraft): string[] {
  return draft.fields
    .filter((field) => {
      if (!field.critical) return false;

      if (field.verification.state === 'VERIFIED') {
        return field.verification.normalizedValue === null;
      }

      if (field.verification.state === 'CONFIRMED') {
        return !field.confirmedValue?.trim();
      }

      return true;
    })
    .map((field) => field.id);
}

export function prepareImportedTestForPublication(input: {
  draft: ImportDraft;
  studentPackage: StudentTestPackage;
  protectedAnswers: ProtectedAnswers;
}): ImportPublicationResult {
  if (containsProtectedAnswerData(input.studentPackage)) {
    return {
      ok: false,
      blockingFieldIds: [],
      reasons: ['Student payload contains protected answer data'],
    };
  }

  const blockingFieldIds = unresolvedCriticalFieldIds(input.draft);
  if (blockingFieldIds.length > 0) {
    return {
      ok: false,
      blockingFieldIds,
      reasons: ['Critical imported fields are unresolved'],
    };
  }

  return {
    ok: true,
    studentPackage: input.studentPackage,
    protectedAnswers: input.protectedAnswers,
  };
}
