export type SessionModule = 'LISTENING' | 'READING' | 'WRITING';
export type SessionMode = 'PRACTICE' | 'MOCK';
export type WritingDelivery = 'COMPUTER' | 'PAPER';

export interface SessionConfig {
  id: string;
  testId: string;
  testVersionId: string;
  modules: SessionModule[];
  mode: SessionMode;
  writingDelivery?: WritingDelivery;
  createdAtMs: number;
}

export type SessionValidationResult =
  | { ok: true; value: SessionConfig }
  | { ok: false; errors: string[] };
