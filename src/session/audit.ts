import type { AttemptAuditEvent, AuditSummary } from './types';

export function appendAuditEvent(
  events: readonly AttemptAuditEvent[],
  event: AttemptAuditEvent,
): AttemptAuditEvent[] {
  return events as AttemptAuditEvent[];
}

export function summarizeAuditEvents(_events: readonly AttemptAuditEvent[]): AuditSummary {
  return {
    practicePauseCount: 0,
    practicePausedMs: 0,
    technicalInterruptionCount: 0,
    technicalInterruptedMs: 0,
  };
}
