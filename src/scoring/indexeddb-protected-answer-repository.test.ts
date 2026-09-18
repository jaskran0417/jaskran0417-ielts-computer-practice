import { beforeEach, describe, expect, it } from 'vitest';
import type { AnswerDefinitionDraft } from '../features/importer/answers/types';
import { IndexedDbProtectedAnswerRepository } from './indexeddb-protected-answer-repository';

const DATABASE_NAME = 'ielts-protected-answers-test';

function definitions(): Record<string, AnswerDefinitionDraft> {
  return {
    'q-1': {
      questionNumber: 1,
      canonical: ['corona'],
      alternatives: [['the corona']],
      normalization: {
        caseSensitive: false,
        collapseWhitespace: true,
        punctuation: 'STRICT',
        maxWords: 2,
      },
      sourceEvidence: [],
      verificationState: 'VERIFIED',
    },
  };
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('IndexedDbProtectedAnswerRepository', () => {
  beforeEach(async () => {
    await deleteDatabase(DATABASE_NAME);
  });

  it('stores protected answers separately by immutable test version', async () => {
    const repository = new IndexedDbProtectedAnswerRepository(DATABASE_NAME);
    const answers = definitions();

    await repository.save('version-1', answers);

    await expect(repository.load('version-1')).resolves.toEqual(answers);
    await expect(repository.load('version-missing')).resolves.toBeNull();
  });
});
