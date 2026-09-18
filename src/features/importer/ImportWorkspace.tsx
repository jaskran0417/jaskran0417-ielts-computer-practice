import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { ImportDraft } from './local/import-repository';
import type {
  ImportBundle,
  ImportModule,
  ImportSourceRole,
  PageRange,
} from './bundle/types';
import { parsePageRanges } from './bundle/page-ranges';
import { publicationReadiness } from './bundle/validation';
import './import-workspace.css';

export type ImportFileProcessor = (file: File) => Promise<ImportDraft>;

export interface ImportWorkspaceProps {
  bundle: ImportBundle | null;
  isImporting?: boolean;
  error?: string | null;
  onCreateBundle(module: ImportModule, title: string): void;
  onAddSource(file: File): void | Promise<void>;
  onAssignSourceRole(input: {
    documentId: string;
    role: ImportSourceRole;
    pageRanges: PageRange[];
  }): void;
  onStructure(): void | Promise<void>;
}

const MODULE_OPTIONS: Array<{ value: ImportModule; label: string }> = [
  { value: 'READING', label: 'Reading' },
  { value: 'LISTENING', label: 'Listening' },
  { value: 'WRITING', label: 'Writing' },
];

const ROLE_OPTIONS: Array<{ value: ImportSourceRole; label: string }> = [
  { value: 'QUESTION_MATERIAL', label: 'Question material' },
  { value: 'ANSWER_KEY', label: 'Answer key' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'WRITING_PROMPT', label: 'Writing prompt' },
  { value: 'STAFF_MARKING_GUIDE', label: 'Staff marking guide' },
  { value: 'SUPPORTING_EVIDENCE', label: 'Supporting evidence' },
];

function formatPageRanges(ranges: PageRange[]): string {
  return ranges
    .map((range) =>
      range.startPage === range.endPage
        ? String(range.startPage)
        : `${range.startPage}–${range.endPage}`,
    )
    .join(', ');
}

function assignmentSummary(
  role: ImportSourceRole,
  ranges: PageRange[],
): string {
  const pages = formatPageRanges(ranges);
  const singular = ranges.length === 1 && ranges[0].startPage === ranges[0].endPage;
  const prefix =
    role === 'QUESTION_MATERIAL'
      ? 'Questions'
      : role === 'ANSWER_KEY'
        ? 'Answer key'
        : ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

  return `${prefix}: ${singular ? 'page' : 'pages'} ${pages}`;
}

export function ImportWorkspace({
  bundle,
  isImporting = false,
  error = null,
  onCreateBundle,
  onAddSource,
  onAssignSourceRole,
  onStructure,
}: ImportWorkspaceProps) {
  const [module, setModule] = useState<ImportModule | null>(null);
  const [title, setTitle] = useState('');
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [role, setRole] = useState<ImportSourceRole | ''>('');
  const [pageExpression, setPageExpression] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!module || !title.trim()) return;
    onCreateBundle(module, title.trim());
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void onAddSource(file);
    event.target.value = '';
  }

  function startRole(documentId: string) {
    setEditingDocumentId(documentId);
    setRole('');
    setPageExpression('');
    setRoleError(null);
  }

  function saveRole(documentId: string) {
    if (!role) {
      setRoleError('Choose a source role');
      return;
    }

    const parsed = parsePageRanges(pageExpression);
    if (!parsed.ok) {
      setRoleError(parsed.error);
      return;
    }

    onAssignSourceRole({
      documentId,
      role,
      pageRanges: parsed.ranges,
    });
    setEditingDocumentId(null);
    setRole('');
    setPageExpression('');
    setRoleError(null);
  }

  if (!bundle) {
    return (
      <section className="import-workspace" aria-labelledby="import-workspace-title">
        <div className="page-heading">
          <div>
            <p className="page-eyebrow">Import / New</p>
            <h1 id="import-workspace-title">Create an import bundle</h1>
            <p className="page-subtitle">
              Choose the module yourself, then add question material, answer keys, audio,
              or other evidence to the same import.
            </p>
          </div>
          <span className="local-badge">Local-first</span>
        </div>

        <form className="setup-panel import-create-form" onSubmit={submitCreate}>
          <fieldset>
            <legend>Module</legend>
            <div className="segmented-control">
              {MODULE_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="import-module"
                    aria-label={option.label}
                    checked={module === option.value}
                    onChange={() => setModule(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="import-text-field">
            <span>Test title</span>
            <input
              aria-label="Test title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Reading Test 1"
            />
          </label>

          <button
            className="primary-action"
            type="submit"
            disabled={!module || !title.trim()}
          >
            Create import
          </button>
        </form>
      </section>
    );
  }

  const readiness = publicationReadiness(bundle);

  return (
    <section className="import-workspace" aria-labelledby="import-workspace-title">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">Import / {bundle.module}</p>
          <h1 id="import-workspace-title">{bundle.title}</h1>
          <p className="page-subtitle">
            Add sources and explicitly tell the importer which pages contain questions,
            answers, or supporting material.
          </p>
        </div>
        <span className="local-badge">{bundle.module}</span>
      </div>

      <div className="import-upload-card">
        <label className="import-file-control">
          <span>{isImporting ? 'Processing source…' : 'Add source file'}</span>
          <input
            type="file"
            aria-label="Add source file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.docx,audio/*"
            onChange={handleFileChange}
            disabled={isImporting}
          />
        </label>
        <div className="import-upload-copy">
          <strong>One import can contain multiple sources</strong>
          <small>
            A single PDF can use different page ranges for question material and its answer key.
          </small>
        </div>
      </div>

      {error ? (
        <div className="import-error" role="alert">
          {error}
        </div>
      ) : null}

      {bundle.sourceDocuments.length === 0 ? (
        <div className="import-empty-state">
          <h2>No sources yet</h2>
          <p>Add the question paper, answer key, or other material for this test.</p>
        </div>
      ) : (
        <div className="import-source-list">
          {bundle.sourceDocuments.map((source) => {
            const assignments = bundle.assignments.filter(
              (assignment) => assignment.documentId === source.id,
            );
            const editing = editingDocumentId === source.id;

            return (
              <article className="setup-panel import-source-card" key={source.id}>
                <div className="import-panel-heading">
                  <div>
                    <p className="page-eyebrow">Source</p>
                    <h2>{source.name}</h2>
                  </div>
                  <small>{source.mediaType || source.kind}</small>
                </div>

                {assignments.length > 0 ? (
                  <ul className="import-role-summary">
                    {assignments.map((assignment) => (
                      <li key={assignment.id}>
                        {assignmentSummary(assignment.role, assignment.pageRanges)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="field-help">No source role assigned yet.</p>
                )}

                {editing ? (
                  <div className="import-role-editor">
                    <label>
                      <span>Role</span>
                      <select
                        aria-label={`Role for ${source.name}`}
                        value={role}
                        onChange={(event) => {
                          setRole(event.target.value as ImportSourceRole | '');
                          setRoleError(null);
                        }}
                      >
                        <option value="">Choose role</option>
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Pages</span>
                      <input
                        aria-label="Pages for selected role"
                        value={pageExpression}
                        onChange={(event) => {
                          setPageExpression(event.target.value);
                          setRoleError(null);
                        }}
                        placeholder="e.g. 1-12 or 13"
                      />
                    </label>

                    {roleError ? <div role="alert">{roleError}</div> : null}

                    <div className="import-role-actions">
                      <button
                        className="primary-action"
                        type="button"
                        onClick={() => saveRole(source.id)}
                      >
                        Save source role
                      </button>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => setEditingDocumentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => startRole(source.id)}
                  >
                    {assignments.length > 0
                      ? 'Add another role'
                      : `Add role to ${source.name}`}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      <footer className="import-publish-bar">
        <div role="status">
          {readiness.ready ? (
            <strong>Source roles are ready for structuring</strong>
          ) : (
            <strong>{readiness.reasons[0] ?? 'More source setup is required'}</strong>
          )}
          <small>
            Structuring will create passages, question groups, typed questions, and protected answer mappings.
          </small>
        </div>
        <button
          className="primary-action"
          type="button"
          disabled={!readiness.ready || isImporting}
          onClick={() => void onStructure()}
        >
          Structure test
        </button>
      </footer>
    </section>
  );
}
