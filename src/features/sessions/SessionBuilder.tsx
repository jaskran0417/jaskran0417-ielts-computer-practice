import { useMemo, useState } from 'react';
import type {
  SessionConfig,
  SessionMode,
  SessionModule,
  WritingDelivery,
} from '../../session/types';
import { validateSessionConfig } from '../../session/validate-session';
import type { TestSummary } from '../../test-catalog/test-catalog-repository';

interface SessionBuilderProps {
  testId?: string;
  testVersionId?: string;
  tests?: TestSummary[];
  selectedTestVersionId?: string;
  nowMs?: number;
  onTestSelected?(summary: TestSummary): void;
  onCreate(config: SessionConfig): void;
}

const MODULE_OPTIONS: Array<{
  value: SessionModule;
  short: string;
  label: string;
  description: string;
}> = [
  {
    value: 'LISTENING',
    short: 'L',
    label: 'Listening',
    description: 'Audio-led questions with mode-specific playback rules.',
  },
  {
    value: 'READING',
    short: 'R',
    label: 'Reading',
    description: 'Timed passage and question workspace.',
  },
  {
    value: 'WRITING',
    short: 'W',
    label: 'Writing',
    description: 'Computer response or paper-delivery session.',
  },
];

export function SessionBuilder({
  testId,
  testVersionId,
  tests,
  selectedTestVersionId,
  nowMs,
  onTestSelected,
  onCreate,
}: SessionBuilderProps) {
  const [createdAtMs] = useState(() => nowMs ?? Date.now());
  const [selectedVersionId, setSelectedVersionId] = useState(
    () => selectedTestVersionId ?? tests?.[0]?.versionId ?? testVersionId ?? '',
  );
  const [modules, setModules] = useState<SessionModule[]>([]);
  const [mode, setMode] = useState<SessionMode>('PRACTICE');
  const [writingDelivery, setWritingDelivery] = useState<WritingDelivery | undefined>();

  const selectedTest = useMemo(
    () => tests?.find((test) => test.versionId === selectedVersionId) ?? null,
    [selectedVersionId, tests],
  );

  const resolvedTestId = selectedTest?.testId ?? testId ?? '';
  const resolvedTestVersionId = selectedTest?.versionId ?? testVersionId ?? '';

  const config = useMemo<SessionConfig>(
    () => ({
      id: `session-${createdAtMs}`,
      testId: resolvedTestId,
      testVersionId: resolvedTestVersionId,
      modules,
      mode,
      createdAtMs,
      ...(writingDelivery ? { writingDelivery } : {}),
    }),
    [
      createdAtMs,
      mode,
      modules,
      resolvedTestId,
      resolvedTestVersionId,
      writingDelivery,
    ],
  );

  const validation = useMemo(() => validateSessionConfig(config), [config]);
  const writingSelected = modules.includes('WRITING');

  function toggleModule(module: SessionModule, checked: boolean) {
    setModules((current) =>
      checked ? [...current, module] : current.filter((item) => item !== module),
    );
    if (module === 'WRITING' && !checked) {
      setWritingDelivery(undefined);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validation.ok) {
      onCreate(validation.value);
    }
  }

  return (
    <section className="session-builder" aria-labelledby="session-builder-title">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">Sessions / New</p>
          <h1 id="session-builder-title">Create a test session</h1>
          <p className="page-subtitle">
            Choose exactly what students will take. The source test stays reusable.
          </p>
        </div>
        <span className="local-badge" title="Core session setup works without internet">
          Local-first
        </span>
      </div>

      <form onSubmit={submit} className="session-form">
        <div className="session-layout">
          <div className="setup-stack">
            {tests ? (
              <fieldset className="setup-panel">
                <legend>Published test</legend>
                <p className="field-help">
                  Choose the exact published test version students will take.
                </p>
                <label>
                  <span className="field-help">Published test</span>
                  <select
                    aria-label="Published test"
                    value={selectedVersionId}
                    disabled={tests.length === 0}
                    onChange={(event) => {
                      const versionId = event.target.value;
                      setSelectedVersionId(versionId);
                      const next = tests.find((test) => test.versionId === versionId);
                      if (next) onTestSelected?.(next);
                    }}
                  >
                    {tests.length === 0 ? (
                      <option value="">No published tests available</option>
                    ) : (
                      tests.map((test) => (
                        <option key={test.versionId} value={test.versionId}>
                          {test.title}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </fieldset>
            ) : null}

            <fieldset className="setup-panel">
              <legend>Modules</legend>
              <p className="field-help">Select one module or combine several for this session.</p>
              <div className="module-grid">
                {MODULE_OPTIONS.map((option) => {
                  const checked = modules.includes(option.value);
                  return (
                    <label
                      className={`module-option${checked ? ' selected' : ''}`}
                      key={option.value}
                    >
                      <input
                        aria-label={option.label}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggleModule(option.value, event.target.checked)}
                      />
                      <span className="module-mark" aria-hidden="true">
                        {option.short}
                      </span>
                      <span className="module-copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span className="selection-check" aria-hidden="true">
                        {checked ? '✓' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="setup-panel">
              <legend>Session mode</legend>
              <p className="field-help">Practice gives learning controls; Mock protects exam-like rules.</p>
              <div className="segmented-control two-up">
                <label className={mode === 'PRACTICE' ? 'selected' : ''}>
                  <input
                    aria-label="Practice"
                    type="radio"
                    name="session-mode"
                    value="PRACTICE"
                    checked={mode === 'PRACTICE'}
                    onChange={() => setMode('PRACTICE')}
                  />
                  <span>
                    <strong>Practice</strong>
                    <small>Pause/replay may be available and is audited.</small>
                  </span>
                </label>
                <label className={mode === 'MOCK' ? 'selected' : ''}>
                  <input
                    aria-label="Mock test"
                    type="radio"
                    name="session-mode"
                    value="MOCK"
                    checked={mode === 'MOCK'}
                    onChange={() => setMode('MOCK')}
                  />
                  <span>
                    <strong>Mock test</strong>
                    <small>Candidate pause, replay and seeking are blocked.</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {writingSelected ? (
              <fieldset className="setup-panel writing-delivery-panel">
                <legend>Writing delivery</legend>
                <p className="field-help">Paper writing can finish without uploading handwritten pages.</p>
                <div className="segmented-control two-up compact">
                  {(['COMPUTER', 'PAPER'] as const).map((delivery) => {
                    const deliveryLabel = delivery === 'COMPUTER' ? 'Computer' : 'Paper';
                    return (
                      <label
                        key={delivery}
                        className={writingDelivery === delivery ? 'selected' : ''}
                      >
                        <input
                          aria-label={deliveryLabel}
                          type="radio"
                          name="writing-delivery"
                          value={delivery}
                          checked={writingDelivery === delivery}
                          onChange={() => setWritingDelivery(delivery)}
                        />
                        <span>
                          <strong>{deliveryLabel}</strong>
                          <small>
                            {delivery === 'COMPUTER'
                              ? 'Type Task 1 and Task 2 in the app.'
                              : 'Show prompts and timer; handwriting stays optional to upload.'}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
          </div>

          <aside className="session-summary" aria-label="Session summary">
            <div className="summary-heading">
              <span>Session summary</span>
              <strong>{mode === 'MOCK' ? 'Mock' : 'Practice'}</strong>
            </div>

            <dl className="summary-list">
              <div>
                <dt>Modules</dt>
                <dd>
                  {modules.length > 0 ? (
                    <span className="module-chip-row">
                      {modules.map((module) => (
                        <span className="module-chip" key={module}>
                          {module[0] + module.slice(1).toLowerCase()}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="summary-empty">None selected</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Listening controls</dt>
                <dd>{mode === 'MOCK' ? 'Exam restrictions' : 'Practice controls + audit'}</dd>
              </div>
              {writingSelected ? (
                <div>
                  <dt>Writing</dt>
                  <dd>
                    {writingDelivery
                      ? writingDelivery === 'PAPER'
                        ? 'Paper delivery'
                        : 'Computer delivery'
                      : 'Choose delivery'}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="summary-note">
              <span className="summary-note-dot" aria-hidden="true" />
              A session records its exact test version and selected conditions.
            </div>
          </aside>
        </div>

        <div className="form-action-bar">
          <div className="validation-slot" aria-live="polite">
            {!validation.ok && modules.length > 0 ? validation.errors[0] : null}
          </div>
          <button className="primary-action" type="submit" disabled={!validation.ok}>
            Create session
          </button>
        </div>
      </form>
    </section>
  );
}
