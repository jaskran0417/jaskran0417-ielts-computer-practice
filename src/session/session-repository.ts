import type { SessionConfig } from './types';

export interface SessionRepository {
  loadSession(id: string): Promise<SessionConfig | null>;
  saveSession(config: SessionConfig): Promise<void>;
  deleteSession(id: string): Promise<void>;
  listSessions(): Promise<SessionConfig[]>;
}
