import { describe, expect, it } from 'vitest';
import type { SessionConfig } from './types';
import { validateSessionConfig } from './validate-session';

function makeConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    id: 'session-1',
    testId: 'test-1',
    testVersionId: 'version-1',
    modules: ['READING'],
    mode: 'PRACTICE',
    createdAtMs: 1_000,
    ...overrides,
  };
}

describe('validateSessionConfig', () => {
  it('rejects an empty module selection', () => {
    const result = validateSessionConfig(makeConfig({ modules: [] }));
    expect(result).toEqual({ ok: false, errors: ['Select at least one module.'] });
  });

  it('rejects duplicate modules', () => {
    const result = validateSessionConfig(makeConfig({ modules: ['READING', 'READING'] }));
    expect(result).toEqual({ ok: false, errors: ['Each module can be selected only once.'] });
  });

  it('requires writing delivery when Writing is selected', () => {
    const result = validateSessionConfig(makeConfig({ modules: ['WRITING'] }));
    expect(result).toEqual({ ok: false, errors: ['Choose how Writing will be completed.'] });
  });

  it('rejects writing delivery when Writing is not selected', () => {
    const result = validateSessionConfig(
      makeConfig({ modules: ['READING'], writingDelivery: 'PAPER' }),
    );
    expect(result).toEqual({
      ok: false,
      errors: ['Writing delivery can only be set when Writing is selected.'],
    });
  });

  it('accepts Listening + Reading Mock', () => {
    const config = makeConfig({ modules: ['LISTENING', 'READING'], mode: 'MOCK' });
    expect(validateSessionConfig(config)).toEqual({ ok: true, value: config });
  });

  it('accepts Writing Paper Practice', () => {
    const config = makeConfig({ modules: ['WRITING'], writingDelivery: 'PAPER' });
    expect(validateSessionConfig(config)).toEqual({ ok: true, value: config });
  });
});
