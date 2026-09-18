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

  it('round-trips passage highlights and notes with the attempt', async () => {
    const repository = new IndexedDbAttemptRepository('ielts-test-attempts');
    const attempt = createAttempt(sampleReadingTest, 1_000);
    attempt.highlights = [{
      id: 'highlight-1',
      passageId: 'passage-1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 6,
      text: 'Cities',
    }];
    attempt.notes = [{
      id: 'note-1',
      passageId: 'passage-1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 6,
      quote: 'Cities',
      body: 'Opening concept',
      updatedAtMs: 2_000,
    }];

    await repository.saveAttempt(attempt);
    const restored = await repository.loadAttempt(attempt.id);

    expect(restored?.highlights).toEqual(attempt.highlights);
    expect(restored?.notes).toEqual(attempt.notes);
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
