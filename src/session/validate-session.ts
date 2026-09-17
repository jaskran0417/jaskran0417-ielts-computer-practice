import type { SessionConfig, SessionValidationResult } from './types';

export function validateSessionConfig(config: SessionConfig): SessionValidationResult {
  return { ok: true, value: config };
}
