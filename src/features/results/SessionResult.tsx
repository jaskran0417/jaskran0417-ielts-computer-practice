import type {
  AuditSummary,
  ScoredModuleResult,
  SessionModule,
  SessionResultSummary,
  WritingModuleResult,
} from '../../session/types';
import './SessionResult.css';

interface SessionResultProps {
  summary: SessionResultSummary;
  audit?: AuditSummary;
}

const MODULES: SessionModule[] = ['LISTENING', 'READING', 'WRITING'];

function moduleLabel(module: SessionModule): string {
  return module[0] + module.slice(1).toLowerCase();
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function isScoredResult(
  result: ScoredModuleResult | WritingModuleResult,
): result is ScoredModuleResult {
  return result.module === 'LISTENING' || result.module === 'READING';
}

function writingStatus(result: WritingModuleResult): string {
  switch (result.state) {
    case 'NOT_INCLUDED':
      return 'Not included';
    case 'COMPLETED_NOT_UPLOADED':
      return 'Writing completed on paper — not submitted to app';
    case 'COMPLETED_PENDING_MARKING':
      return 'Writing completed — score pending';
    case 'MARKED':
      return typeof result.band === 'number' ? `Band ${result.band}` : 'Marked';
  }
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function SessionResult({ summary, audit }: SessionResultProps) {
  const resultByModule = new Map(summary.modules.map((result) => [result.module, result]));
  const hasAudit = Boolean(
    audit &&
      (audit.practicePauseCount > 0 ||
        audit.practicePausedMs > 0 ||
        audit.technicalInterruptionCount > 0 ||
        audit.technicalInterruptedMs > 0),
  );

  return (
    <section className="result-page" aria-labelledby="session-result-title">
      <div className="page-heading result-heading">
        <div>
          <p className="page-eyebrow">Results</p>
          <h1 id="session-result-title">Session result</h1>
          <p className="page-subtitle">
            Scores are shown only for modules included and actually assessed in this session.
          </p>
        </div>
        <span className={`result-state result-state-${summary.overallStatus.toLowerCase()}`}>
          {summary.overallStatus === 'PENDING'
            ? 'Marking pending'
            : summary.overallStatus === 'COMPLETE'
              ? 'Selected modules complete'
              : 'Partial session'}
        </span>
      </div>

      <div className="result-grid" aria-label="Module results">
        {MODULES.map((module) => {
          const result = resultByModule.get(module);
          const selected = summary.selectedModules.includes(module);

          if (module === 'WRITING') {
            const writing: WritingModuleResult =
              result?.module === 'WRITING'
                ? result
                : {
                    module: 'WRITING',
                    state: selected ? 'COMPLETED_PENDING_MARKING' : 'NOT_INCLUDED',
                  };
            return (
              <article className="result-card" key={module}>
                <div className="result-card-header">
                  <span className="result-module-mark" aria-hidden="true">
                    W
                  </span>
                  <div>
                    <h2>Writing</h2>
                    <span>
                      {writing.delivery === 'PAPER'
                        ? 'Paper delivery'
                        : writing.delivery === 'COMPUTER'
                          ? 'Computer delivery'
                          : 'Module status'}
                    </span>
                  </div>
                </div>
                <p
                  className={`result-primary${writing.state === 'NOT_INCLUDED' ? ' muted' : ''}`}
                  data-testid="result-writing-status"
                >
                  {writingStatus(writing)}
                </p>
              </article>
            );
          }

          const scored = result && isScoredResult(result) ? result : undefined;
          return (
            <article className="result-card" key={module}>
              <div className="result-card-header">
                <span className="result-module-mark" aria-hidden="true">
                  {module[0]}
                </span>
                <div>
                  <h2>{moduleLabel(module)}</h2>
                  <span>{selected ? 'Scored module' : 'Not selected'}</span>
                </div>
              </div>

              {!selected ? (
                <p className="result-primary muted">Not included</p>
              ) : (
                <div className="score-stack">
                  {typeof scored?.rawScore === 'number' && typeof scored.totalQuestions === 'number' ? (
                    <strong className="raw-score">
                      {scored.rawScore} / {scored.totalQuestions}
                    </strong>
                  ) : null}
                  <span className="band-score">
                    {typeof scored?.band === 'number' ? `Band ${scored.band}` : 'Score pending'}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <section className="overall-panel" aria-labelledby="overall-result-title">
        <div>
          <p className="section-kicker">Overall</p>
          <h2 id="overall-result-title">Overall IELTS band unavailable for this session</h2>
          <p>
            A full IELTS Overall Band requires all four skills, including Speaking. Partial or selected-module sessions remain useful without being presented as a full result.
          </p>
        </div>
        <div className="overall-value" aria-label="No overall band">
          —
        </div>
      </section>

      {hasAudit && audit ? (
        <section className="attempt-conditions" aria-labelledby="attempt-conditions-title">
          <div>
            <p className="section-kicker">Attempt conditions</p>
            <h2 id="attempt-conditions-title">Session activity</h2>
            <p>
              Practice controls and technical interruptions are reported separately and do not alter the academic score.
            </p>
          </div>
          <div className="audit-metrics">
            <div>
              <strong>
                {countLabel(audit.practicePauseCount, 'practice pause', 'practice pauses')}
              </strong>
              <small>{formatDuration(audit.practicePausedMs)} paused</small>
            </div>
            <div>
              <strong>
                {countLabel(
                  audit.technicalInterruptionCount,
                  'technical interruption',
                  'technical interruptions',
                )}
              </strong>
              <small>{formatDuration(audit.technicalInterruptedMs)} interrupted</small>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
