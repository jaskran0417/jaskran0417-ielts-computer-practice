import type { ExamAttemptState } from './types';

export function remainingSeconds(state: ExamAttemptState, nowMs: number): number {
  if (state.status === 'SUBMITTED' && state.submittedAtMs !== undefined) {
    nowMs = Math.min(nowMs, state.submittedAtMs);
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - state.startedAtMs) / 1000));
  return Math.max(0, state.durationSeconds - elapsedSeconds);
}
