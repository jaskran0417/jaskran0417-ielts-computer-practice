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

export type AttemptAuditEvent =
  | {
      id: string;
      type: 'PRACTICE_PAUSE';
      module: SessionModule;
      startedAtMs: number;
      endedAtMs: number;
      audioPositionSeconds?: number;
    }
  | {
      id: string;
      type: 'TECHNICAL_INTERRUPTION';
      module: SessionModule;
      startedAtMs: number;
      endedAtMs: number;
      lastSecureAudioPositionSeconds?: number;
      recoveryAudioPositionSeconds?: number;
      source: 'SYSTEM' | 'TEACHER';
      note?: string;
    };

export interface AuditSummary {
  practicePauseCount: number;
  practicePausedMs: number;
  technicalInterruptionCount: number;
  technicalInterruptedMs: number;
}
