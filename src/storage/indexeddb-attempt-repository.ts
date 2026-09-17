import { openDB, type DBSchema } from 'idb';
import type { ExamAttemptState } from '../exam-engine/types';
import type { AttemptRepository } from './attempt-repository';

interface AttemptDatabase extends DBSchema {
  attempts: {
    key: string;
    value: ExamAttemptState;
  };
}

export class IndexedDbAttemptRepository implements AttemptRepository {
  constructor(private readonly databaseName = 'ielts-attempts') {}

  private open() {
    return openDB<AttemptDatabase>(this.databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('attempts')) {
          database.createObjectStore('attempts', { keyPath: 'id' });
        }
      },
    });
  }

  async loadAttempt(id: string): Promise<ExamAttemptState | null> {
    const database = await this.open();
    const attempt = await database.get('attempts', id);
    database.close();
    return attempt ?? null;
  }

  async loadActiveAttempt(testVersionId: string): Promise<ExamAttemptState | null> {
    const database = await this.open();
    const attempts = await database.getAll('attempts');
    database.close();

    const activeAttempts = attempts
      .filter((attempt) => attempt.testVersionId === testVersionId && attempt.status === 'ACTIVE')
      .sort((left, right) => right.startedAtMs - left.startedAtMs);

    return activeAttempts[0] ?? null;
  }

  async saveAttempt(attempt: ExamAttemptState): Promise<void> {
    const database = await this.open();
    await database.put('attempts', attempt);
    database.close();
  }

  async deleteAttempt(id: string): Promise<void> {
    const database = await this.open();
    await database.delete('attempts', id);
    database.close();
  }
}
