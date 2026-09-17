import { describe, expect, it } from 'vitest';
import type { SessionConfig, WritingModuleResult } from './types';
import { buildSessionResultSummary } from './results';

function config(modules: SessionConfig['modules']): SessionConfig {
  return {
    id: 's1',
    testId: 't1',
    testVersionId: 'v1',
    modules,
    mode: 'MOCK',
    writingDelivery: modules.includes('WRITING') ? 'PAPER' : undefined,
    createdAtMs: 1,
  };
}

describe('session result composition', () => {
  it('treats a Reading-only result as a partial session with no overall band', () => {
    const result = buildSessionResultSummary({
      config: config(['READING']),
      scoredModules: [{ module: 'READING', rawScore: 34, totalQuestions: 40, band: 7.5 }],
    });

    expect(result.overallBand).toBeNull();
    expect(result.overallStatus).toBe('NOT_APPLICABLE');
    expect(result.modules).toContainEqual({ module: 'WRITING', state: 'NOT_INCLUDED' });
  });

  it('treats Listening + Reading as partial and never invents a full overall band', () => {
    const result = buildSessionResultSummary({
      config: config(['LISTENING', 'READING']),
      scoredModules: [
        { module: 'LISTENING', band: 7.5 },
        { module: 'READING', band: 8 },
      ],
    });

    expect(result.overallBand).toBeNull();
    expect(result.overallStatus).toBe('NOT_APPLICABLE');
  });

  it('keeps a full configured L/R/W session pending while Writing awaits marking', () => {
    const writing: WritingModuleResult = {
      module: 'WRITING',
      state: 'COMPLETED_PENDING_MARKING',
      delivery: 'PAPER',
    };
    const result = buildSessionResultSummary({
      config: config(['LISTENING', 'READING', 'WRITING']),
      scoredModules: [
        { module: 'LISTENING', band: 7 },
        { module: 'READING', band: 7.5 },
      ],
      writing,
    });

    expect(result.overallStatus).toBe('PENDING');
    expect(result.overallBand).toBeNull();
    expect(result.modules).toContainEqual(writing);
  });

  it('preserves paper Writing not-uploaded as a valid completed result state', () => {
    const writing: WritingModuleResult = {
      module: 'WRITING',
      state: 'COMPLETED_NOT_UPLOADED',
      delivery: 'PAPER',
    };
    const result = buildSessionResultSummary({
      config: config(['WRITING']),
      scoredModules: [],
      writing,
    });

    expect(result.modules).toContainEqual(writing);
    expect(result.overallStatus).toBe('NOT_APPLICABLE');
  });

  it('can mark selected L/R/W results complete without manufacturing a four-skill IELTS overall band', () => {
    const result = buildSessionResultSummary({
      config: config(['LISTENING', 'READING', 'WRITING']),
      scoredModules: [
        { module: 'LISTENING', band: 8 },
        { module: 'READING', band: 7.5 },
      ],
      writing: { module: 'WRITING', state: 'MARKED', delivery: 'PAPER', band: 7 },
    });

    expect(result.overallStatus).toBe('COMPLETE');
    expect(result.overallBand).toBeNull();
  });
});
