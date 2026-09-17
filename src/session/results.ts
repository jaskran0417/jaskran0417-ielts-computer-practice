import type {
  ScoredModuleResult,
  SessionConfig,
  SessionResultSummary,
  WritingModuleResult,
} from './types';

export function buildSessionResultSummary(input: {
  config: SessionConfig;
  scoredModules: ScoredModuleResult[];
  writing?: WritingModuleResult;
}): SessionResultSummary {
  const writingSelected = input.config.modules.includes('WRITING');
  const writing: WritingModuleResult = writingSelected
    ? input.writing ?? {
        module: 'WRITING',
        state: 'COMPLETED_PENDING_MARKING',
        delivery: input.config.writingDelivery,
      }
    : { module: 'WRITING', state: 'NOT_INCLUDED' };

  const modules: SessionResultSummary['modules'] = [
    ...input.scoredModules.filter((result) => input.config.modules.includes(result.module)),
    writing,
  ];

  const isConfiguredLrwSession =
    input.config.modules.length === 3 &&
    input.config.modules.includes('LISTENING') &&
    input.config.modules.includes('READING') &&
    writingSelected;

  if (!isConfiguredLrwSession) {
    return {
      selectedModules: [...input.config.modules],
      modules,
      overallBand: null,
      overallStatus: 'NOT_APPLICABLE',
    };
  }

  const listening = input.scoredModules.find((result) => result.module === 'LISTENING');
  const reading = input.scoredModules.find((result) => result.module === 'READING');
  const selectedResultsComplete =
    typeof listening?.band === 'number' &&
    typeof reading?.band === 'number' &&
    writing.state === 'MARKED' &&
    typeof writing.band === 'number';

  return {
    selectedModules: [...input.config.modules],
    modules,
    // IELTS Overall requires Speaking too. Do not manufacture an official-looking
    // overall band from only Listening, Reading, and Writing.
    overallBand: null,
    overallStatus: selectedResultsComplete ? 'COMPLETE' : 'PENDING',
  };
}
