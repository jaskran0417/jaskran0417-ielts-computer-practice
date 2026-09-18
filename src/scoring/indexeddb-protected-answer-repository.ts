import { openDB, type DBSchema } from 'idb';
import type { AnswerDefinitionDraft } from '../features/importer/answers/types';

export type ProtectedAnswerSet = Record<string, AnswerDefinitionDraft>;

export interface ProtectedAnswerRepository {
  save(versionId: string, answers: ProtectedAnswerSet): Promise<void>;
  load(versionId: string): Promise<ProtectedAnswerSet | null>;
}

interface ProtectedAnswerDatabase extends DBSchema {
  protectedAnswers: {
    key: string;
    value: {
      versionId: string;
      answers: ProtectedAnswerSet;
    };
  };
}

export class IndexedDbProtectedAnswerRepository
  implements ProtectedAnswerRepository
{
  constructor(private readonly databaseName = 'ielts-protected-answers') {}

  private open() {
    return openDB<ProtectedAnswerDatabase>(this.databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('protectedAnswers')) {
          database.createObjectStore('protectedAnswers', { keyPath: 'versionId' });
        }
      },
    });
  }

  async save(versionId: string, answers: ProtectedAnswerSet): Promise<void> {
    const database = await this.open();
    try {
      await database.put('protectedAnswers', { versionId, answers });
    } finally {
      database.close();
    }
  }

  async load(versionId: string): Promise<ProtectedAnswerSet | null> {
    const database = await this.open();
    try {
      const stored = await database.get('protectedAnswers', versionId);
      return stored?.answers ?? null;
    } finally {
      database.close();
    }
  }
}
