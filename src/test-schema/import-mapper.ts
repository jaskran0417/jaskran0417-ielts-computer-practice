import type { ImportDraft } from '../features/importer/local/import-repository';
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

export function prepareImportedTestForPublication(_input: {
  draft: ImportDraft;
  studentPackage: StudentTestPackage;
  protectedAnswers: ProtectedAnswers;
}): PublicationPreparationResult {
  throw new Error('Not implemented');
}
