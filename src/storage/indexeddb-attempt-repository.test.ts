import { beforeEach, describe, expect, it } from 'vitest';
import { sampleReadingTest } from '../test-schema/sample-reading';
import { createAttempt } from '../exam-engine/create-attempt';
import { IndexedDbAttemptRepository } from './indexeddb-attempt-repository';

describe('IndexedDbAttemptRepository', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('ielts-test-attempts');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('round-trips and deletes an attempt', async () => {
    const repository = new IndexedDbAttemptRepository('ielts-test-attempts');
    const attempt = createAttempt(sampleReadingTest, 1_000);

    await repository.saveAttempt(attempt);
    expect(await repository.loadAttempt(attempt.id)).toEqual(attempt);

    await repository.deleteAttempt(attempt.id);
    expect(await repository.loadAttempt(attempt.id)).toBeNull();
  });
});
