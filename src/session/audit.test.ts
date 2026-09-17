import { describe, expect, it } from 'vitest';
import { appendAuditEvent, summarizeAuditEvents } from './audit';
import type { AttemptAuditEvent } from './types';

describe('attempt audit events', () => {
  it('appends without mutating history and preserves audio position', () => {
    const original: AttemptAuditEvent[] = [];
    const event: AttemptAuditEvent = {
      id: 'pause-1',
      type: 'PRACTICE_PAUSE',
      module: 'LISTENING',
      startedAtMs: 1_000,
      endedAtMs: 3_500,
      audioPositionSeconds: 42.75,
    };

    const next = appendAuditEvent(original, event);

    expect(original).toEqual([]);
    expect(next).not.toBe(original);
    expect(next).toEqual([event]);
    expect(next[0].type === 'PRACTICE_PAUSE' ? next[0].audioPositionSeconds : undefined).toBe(42.75);
  });

  it('separates practice pauses from technical interruptions', () => {
    const events: AttemptAuditEvent[] = [
      {
        id: 'pause-1',
        type: 'PRACTICE_PAUSE',
        module: 'LISTENING',
        startedAtMs: 1_000,
        endedAtMs: 4_000,
        audioPositionSeconds: 12,
      },
      {
        id: 'tech-1',
        type: 'TECHNICAL_INTERRUPTION',
        module: 'LISTENING',
        startedAtMs: 10_000,
        endedAtMs: 12_500,
        lastSecureAudioPositionSeconds: 100,
        recoveryAudioPositionSeconds: 102,
        source: 'SYSTEM',
      },
    ];

    expect(summarizeAuditEvents(events)).toEqual({
      practicePauseCount: 1,
      practicePausedMs: 3_000,
      technicalInterruptionCount: 1,
      technicalInterruptedMs: 2_500,
    });
  });

  it('clamps malformed negative durations to zero', () => {
    const events: AttemptAuditEvent[] = [
      {
        id: 'pause-bad',
        type: 'PRACTICE_PAUSE',
        module: 'LISTENING',
        startedAtMs: 5_000,
        endedAtMs: 4_000,
      },
    ];

    expect(summarizeAuditEvents(events).practicePausedMs).toBe(0);
  });
});
