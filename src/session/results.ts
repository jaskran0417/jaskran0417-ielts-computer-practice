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
  return {
    selectedModules: input.config.modules,
    modules: input.scoredModules,
    overallBand: 9,
    overallStatus: 'COMPLETE',
  };
}
