import type { AttemptAuditEvent, AuditSummary } from './types';

export function appendAuditEvent(
  events: readonly AttemptAuditEvent[],
  event: AttemptAuditEvent,
): AttemptAuditEvent[] {
  return [...events, event];
}

function durationMs(event: AttemptAuditEvent): number {
  return Math.max(0, event.endedAtMs - event.startedAtMs);
}

export function summarizeAuditEvents(events: readonly AttemptAuditEvent[]): AuditSummary {
  return events.reduce<AuditSummary>(
    (summary, event) => {
      if (event.type === 'PRACTICE_PAUSE') {
        summary.practicePauseCount += 1;
        summary.practicePausedMs += durationMs(event);
      } else {
        summary.technicalInterruptionCount += 1;
        summary.technicalInterruptedMs += durationMs(event);
      }
      return summary;
    },
    {
      practicePauseCount: 0,
      practicePausedMs: 0,
      technicalInterruptionCount: 0,
      technicalInterruptedMs: 0,
    },
  );
}
