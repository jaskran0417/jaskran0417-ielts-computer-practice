import { useMemo, useState, type ChangeEvent } from 'react';
import type {
  ImportBundle,
  ImportModule,
  ImportSourceAssignment,
  ImportSourceRole,
} from '../bundle/domain';
import type { ObjectiveScoringMode } from '../../../test-schema/types';

export interface ImportSourceManagerProps {
  bundle: ImportBundle | null;
  onCreate(module: ImportModule, title: string): void;
  onAddFiles(files: File[]): void;
  onAssign(assignment: ImportSourceAssignment): void;
  onRemoveSource?(sourceDocumentId: string): void;
  onRemoveAssignment?(index: number): void;
  onClearImport?(): void;
  onClearSources?(): void;
  onScoringModeChange?(mode: ObjectiveScoringMode): void;
}

const MODULES: Array<{ module: ImportModule; label: string }> = [
  { module: 'READING', label: 'Reading' },
  { module: 'LISTENING', label: 'Listening' },
  { module: 'WRITING', label: 'Writing' },
];

const SOURCE_ROLES: Array<{ role: ImportSourceRole; label: string }> = [
  { role: 'QUESTION_MATERIAL', label: 'Question material' },
  { role: 'ANSWER_KEY', label: 'Answer key' },
  { role: 'AUDIO', label: 'Audio' },
  { role: 'WRITING_PROMPT', label: 'Writing prompt' },
  { role: 'STAFF_MARKING_GUIDE', label: 'Staff marking guide' },
  { role: 'SUPPORTING_EVIDENCE', label: 'Supporting evidence' },
];

function defaultTitle(module: ImportModule): string {
  const label = module[0] + module.slice(1).toLowerCase();
  return `Untitled ${label} Test`;
}

export function ImportSourceManager({
  bundle,
  onCreate,
  onAddFiles,
  onAssign,
  onRemoveSource,
  onRemoveAssignment,
  onClearImport,
  onClearSources,
  onScoringModeChange,
}: ImportSourceManagerProps) {
  const [sourceDocumentId, setSourceDocumentId] = useState(
    () => bundle?.sourceDocuments[0]?.id ?? '',
  );
  const [role, setRole] = useState<ImportSourceRole>('QUESTION_MATERIAL');
  const [startPage, setStartPage] = useState('1');
  const [endPage, setEndPage] = useState('1');

  const effectiveSourceDocumentId =
    sourceDocumentId || bundle?.sourceDocuments[0]?.id || '';

  const selectedSource = useMemo(
    () =>
      bundle?.sourceDocuments.find(
        (source) => source.id === effectiveSourceDocumentId,
      ) ?? null,
    [bundle, effectiveSourceDocumentId],
  );

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      onAddFiles(files);
    }
  }

  function assignPages() {
    if (!selectedSource) return;

    const start = Number(startPage);
    const end = Number(endPage);

    onAssign({
      sourceDocumentId: selectedSource.id,
      role,
      pageRanges:
        selectedSource.kind === 'PDF'
          ? [{ startPage: start, endPage: end }]
          : undefined,
    });
  }

  if (!bundle) {
    return (
      <section className="import-source-manager" aria-labelledby="import-module-title">
        <p className="page-eyebrow">Step 1</p>
        <h2 id="import-module-title">Choose module</h2>
        <p className="page-subtitle">
          Choose the module yourself. The importer converts the supplied material into that test type.
        </p>
        <div className="import-module-buttons">
          {MODULES.map(({ module, label }) => (
            <button
              key={module}
              type="button"
              className="secondary-action"
              onClick={() => onCreate(module, defaultTitle(module))}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="import-source-manager" aria-labelledby="import-sources-title">
      <div className="import-panel-heading">
        <div>
          <p className="page-eyebrow">Source bundle</p>
          <h2 id="import-sources-title">{bundle.title}</h2>
          <small>{bundle.module} · {bundle.sourceDocuments.length} source file{bundle.sourceDocuments.length === 1 ? '' : 's'}</small>
        </div>
        <div className="import-heading-actions">
          {onClearSources && bundle.sourceDocuments.length > 0 ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => onClearSources()}
              aria-label="Clear all imported sources"
            >
              Clear sources
            </button>
          ) : null}
          {onClearImport ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => onClearImport()}
              aria-label="Start a new import"
            >
              New import
            </button>
          ) : null}
        </div>
      </div>


      {bundle.module === 'READING' ? (
        <label className="import-scoring-mode">
          <span>Scoring</span>
          <select
            aria-label="Reading scoring mode"
            value={bundle.scoringMode ?? 'AUTO'}
            onChange={(event) =>
              onScoringModeChange?.(event.target.value as ObjectiveScoringMode)
            }
          >
            <option value="AUTO">Automatic scoring — answer key required</option>
            <option value="MANUAL">Teacher/manual scoring — answer key optional</option>
            <option value="UNSCORED">Unscored practice — answer key optional</option>
          </select>
          <small>
            Automatic scoring needs verified answers. Manual and unscored tests can be
            published without an answer key.
          </small>
        </label>
      ) : null}

      <label className="import-file-control">
        <span>Add source files</span>
        <input
          type="file"
          multiple
          aria-label="Add source files"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.docx,audio/*"
          onChange={handleFiles}
        />
      </label>

      {bundle.sourceDocuments.length > 0 ? (
        <div className="import-role-assignment">
          <label>
            <span>Source file</span>
            <select
              aria-label="Source file"
              value={effectiveSourceDocumentId}
              onChange={(event) => setSourceDocumentId(event.target.value)}
            >
              {bundle.sourceDocuments.map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </label>
          {onRemoveSource ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                if (!selectedSource) return;
                onRemoveSource(selectedSource.id);
                setSourceDocumentId('');
              }}
            >
              Remove source
            </button>
          ) : null}

          <label>
            <span>Source role</span>
            <select
              aria-label="Source role"
              value={role}
              onChange={(event) => setRole(event.target.value as ImportSourceRole)}
            >
              {SOURCE_ROLES.map((item) => (
                <option key={item.role} value={item.role}>{item.label}</option>
              ))}
            </select>
          </label>

          {selectedSource?.kind === 'PDF' ? (
            <>
              <label>
                <span>Start page</span>
                <input
                  aria-label="Start page"
                  type="number"
                  min="1"
                  value={startPage}
                  onChange={(event) => setStartPage(event.target.value)}
                />
              </label>
              <label>
                <span>End page</span>
                <input
                  aria-label="End page"
                  type="number"
                  min="1"
                  value={endPage}
                  onChange={(event) => setEndPage(event.target.value)}
                />
              </label>
            </>
          ) : null}

          <button type="button" className="secondary-action" onClick={assignPages}>
            Assign pages
          </button>
        </div>
      ) : null}

      {bundle.assignments.length > 0 ? (
        <div className="import-assignment-list" aria-label="Assigned source roles">
          {bundle.assignments.map((assignment, index) => {
            const source = bundle.sourceDocuments.find(
              (document) => document.id === assignment.sourceDocumentId,
            );
            const ranges = assignment.pageRanges
              ?.map((range) => `pages ${range.startPage}–${range.endPage}`)
              .join(', ');

            return (
              <div key={`${assignment.sourceDocumentId}-${assignment.role}-${index}`}>
                <strong>{source?.name ?? 'Source'}</strong>
                <span>{assignment.role}{ranges ? ` · ${ranges}` : ''}</span>
                {onRemoveAssignment ? (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => onRemoveAssignment(index)}
                    aria-label={`Remove ${assignment.role} assignment`}
                  >
                    Remove assignment
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
