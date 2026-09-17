import { openDB, type DBSchema } from 'idb';
import type { SessionConfig } from './types';
import type { SessionRepository } from './session-repository';

interface SessionDatabase extends DBSchema {
  sessions: {
    key: string;
    value: SessionConfig;
  };
}

export class IndexedDbSessionRepository implements SessionRepository {
  constructor(private readonly databaseName = 'ielts-sessions') {}

  private open() {
    return openDB<SessionDatabase>(this.databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('sessions')) {
          database.createObjectStore('sessions', { keyPath: 'id' });
        }
      },
    });
  }

  async loadSession(id: string): Promise<SessionConfig | null> {
    const database = await this.open();
    const session = await database.get('sessions', id);
    database.close();
    return session ?? null;
  }

  async saveSession(config: SessionConfig): Promise<void> {
    const database = await this.open();
    await database.put('sessions', config);
    database.close();
  }

  async deleteSession(id: string): Promise<void> {
    const database = await this.open();
    await database.delete('sessions', id);
    database.close();
  }

  async listSessions(): Promise<SessionConfig[]> {
    const database = await this.open();
    const sessions = await database.getAll('sessions');
    database.close();
    return sessions.sort((left, right) => right.createdAtMs - left.createdAtMs);
  }
}
