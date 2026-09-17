import type { SessionConfig, SessionModule, SessionValidationResult } from './types';

const SUPPORTED_MODULES = new Set<SessionModule>(['LISTENING', 'READING', 'WRITING']);

export function validateSessionConfig(config: SessionConfig): SessionValidationResult {
  const errors: string[] = [];

  if (config.modules.length === 0) {
    errors.push('Select at least one module.');
  }

  if (new Set(config.modules).size !== config.modules.length) {
    errors.push('Each module can be selected only once.');
  }

  if (config.modules.some((module) => !SUPPORTED_MODULES.has(module))) {
    errors.push('One or more selected modules are not supported.');
  }

  const includesWriting = config.modules.includes('WRITING');

  if (includesWriting && !config.writingDelivery) {
    errors.push('Choose how Writing will be completed.');
  }

  if (!includesWriting && config.writingDelivery) {
    errors.push('Writing delivery can only be set when Writing is selected.');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: config };
}
