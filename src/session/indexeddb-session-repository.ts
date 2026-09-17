import type { SessionConfig } from './types';
import type { SessionRepository } from './session-repository';

export class IndexedDbSessionRepository implements SessionRepository {
  constructor(private readonly databaseName = 'ielts-sessions') {}

  async loadSession(_id: string): Promise<SessionConfig | null> {
    void this.databaseName;
    return null;
  }

  async saveSession(_config: SessionConfig): Promise<void> {}

  async deleteSession(_id: string): Promise<void> {}

  async listSessions(): Promise<SessionConfig[]> {
    return [];
  }
}
