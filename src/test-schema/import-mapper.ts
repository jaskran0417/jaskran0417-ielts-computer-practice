import type { ImportDraft, ImportFieldRecord } from '../features/importer/local/import-repository';
import type { StudentTestPackage } from './types';

export type ProtectedAnswers = Record<string, string>;

export type PublicationPreparationResult =
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

const protectedStudentPayloadKeys = new Set([
  'correctAnswer',
  'correctAnswers',
  'protectedAnswer',
  'protectedAnswers',
  'answerDefinition',
  'answerDefinitions',
]);

function containsProtectedAnswerData(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== 'object') return false;

  const objectValue = value as Record<string, unknown>;
  if (seen.has(objectValue)) return false;
  seen.add(objectValue);

  for (const [key, nestedValue] of Object.entries(objectValue)) {
    if (protectedStudentPayloadKeys.has(key)) return true;
    if (containsProtectedAnswerData(nestedValue, seen)) return true;
  }

  return false;
}

function isCriticalFieldResolved(field: ImportFieldRecord): boolean {
  if (!field.critical) return true;

  if (field.verification.state === 'VERIFIED') {
    return Boolean(field.verification.normalizedValue?.trim());
  }

  if (field.verification.state === 'CONFIRMED') {
    return Boolean(field.confirmedValue?.trim());
  }

  return false;
}

export function prepareImportedTestForPublication(input: {
  draft: ImportDraft;
  studentPackage: StudentTestPackage;
  protectedAnswers: ProtectedAnswers;
}): PublicationPreparationResult {
  if (containsProtectedAnswerData(input.studentPackage)) {
    return {
      ok: false,
      blockingFieldIds: [],
      reasons: ['Student payload contains protected answer data'],
    };
  }

  const blockingFieldIds = input.draft.fields
    .filter((field) => !isCriticalFieldResolved(field))
    .map((field) => field.id);

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
