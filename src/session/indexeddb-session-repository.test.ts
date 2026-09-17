import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionConfig } from './types';
import { IndexedDbSessionRepository } from './indexeddb-session-repository';

const DATABASE_NAME = 'ielts-test-sessions';

function makeSession(id: string, createdAtMs: number): SessionConfig {
  return {
    id,
    testId: 'test-1',
    testVersionId: 'version-1',
    modules: ['READING'],
    mode: 'PRACTICE',
    createdAtMs,
  };
}

describe('IndexedDbSessionRepository', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('saves loads and deletes a session', async () => {
    const repository = new IndexedDbSessionRepository(DATABASE_NAME);
    const session = makeSession('session-1', 1_000);

    await repository.saveSession(session);
    expect(await repository.loadSession(session.id)).toEqual(session);

    await repository.deleteSession(session.id);
    expect(await repository.loadSession(session.id)).toBeNull();
  });

  it('overwrites a session by id', async () => {
    const repository = new IndexedDbSessionRepository(DATABASE_NAME);
    const original = makeSession('session-1', 1_000);
    const updated = { ...original, modules: ['LISTENING', 'READING'] as const, mode: 'MOCK' as const };

    await repository.saveSession(original);
    await repository.saveSession({ ...updated, modules: [...updated.modules] });

    expect(await repository.loadSession(original.id)).toEqual({ ...updated, modules: [...updated.modules] });
  });

  it('lists newest sessions first', async () => {
    const repository = new IndexedDbSessionRepository(DATABASE_NAME);
    const oldest = makeSession('old', 1_000);
    const newest = makeSession('new', 3_000);
    const middle = makeSession('mid', 2_000);

    await repository.saveSession(oldest);
    await repository.saveSession(newest);
    await repository.saveSession(middle);

    expect((await repository.listSessions()).map((session) => session.id)).toEqual(['new', 'mid', 'old']);
  });
});
