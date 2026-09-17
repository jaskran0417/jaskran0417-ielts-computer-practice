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

  it('loads the newest active attempt for the requested test version', async () => {
    const repository = new IndexedDbAttemptRepository('ielts-test-attempts');
    const olderActive = createAttempt(sampleReadingTest, 1_000);
    const newerActive = createAttempt(sampleReadingTest, 2_000);
    const submitted = {
      ...createAttempt(sampleReadingTest, 3_000),
      status: 'SUBMITTED' as const,
      submittedAtMs: 4_000,
    };

    await repository.saveAttempt(olderActive);
    await repository.saveAttempt(newerActive);
    await repository.saveAttempt(submitted);

    expect(await repository.loadActiveAttempt(sampleReadingTest.versionId)).toEqual(newerActive);
  });
});
