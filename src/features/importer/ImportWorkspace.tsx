import { useMemo, useState } from 'react';
import {
  assignSourceRole,
} from './bundle/import-bundle';
import type {
  ImportBundle,
  ImportModule,
  ImportSourceAssignment,
} from './bundle/domain';
import { ConflictEditor } from './components/ConflictEditor';
import { ImportSourceManager } from './components/ImportSourceManager';
import { SourceEvidencePane } from './components/SourceEvidencePane';
import { VerificationBadge } from './components/VerificationBadge';
import type { ImportDraft, ImportFieldRecord } from './local/import-repository';
import { buildReadingImportModel } from './reading/reading-import-converter';
import './import-workspace.css';

export type ImportFileProcessor = (file: File) => Promise<ImportDraft>;

export interface ImportWorkspaceProps {
  processFile: ImportFileProcessor;
  initialDraft?: ImportDraft | null;
  initialBundle?: ImportBundle | null;
  onDraftChange?(draft: ImportDraft): void;
  onBundleChange?(bundle: ImportBundle): void;
  onPublish?(draft: ImportDraft): void;
}

function createWorkspaceId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isResolved(field: ImportFieldRecord): boolean {
  if (!field.critical) return true;
  if (field.verification.state === 'VERIFIED') {
    return Boolean(field.verification.normalizedValue?.trim());
  }
  if (field.verification.state === 'CONFIRMED') {
    return Boolean(field.confirmedValue?.trim());
  }
  return false;
}

function preferredFieldId(draft: ImportDraft | null | undefined): string | null {
  if (!draft) return null;

  const preferred =
    draft.fields.find(
      (field) =>
        field.verification.state === 'REVIEW_REQUIRED' ||
        field.verification.state === 'UNREADABLE',
    ) ?? draft.fields[0];

  return preferred?.id ?? null;
}

function fieldPreview(field: ImportFieldRecord): string {
  return (
    field.confirmedValue ??
    field.verification.normalizedValue ??
    field.verification.passA?.value ??
    field.verification.passB?.value ??
    'No reliable value extracted'
  );
}

function mergeDraft(
  current: ImportDraft | null,
  imported: ImportDraft,
  updatedAtMs: number,
): ImportDraft {
  if (!current) {
    return {
      ...imported,
      updatedAtMs,
    };
  }

  return {
    ...current,
    sourceDocuments: [...current.sourceDocuments, ...imported.sourceDocuments],
    fields: [...current.fields, ...imported.fields],
    updatedAtMs,
  };
}

export function ImportWorkspace({
  processFile,
  initialDraft = null,
  initialBundle = null,
  onDraftChange,
  onBundleChange,
  onPublish,
}: ImportWorkspaceProps) {
  const [bundle, setBundle] = useState<ImportBundle | null>(initialBundle);
  const [draft, setDraft] = useState<ImportDraft | null>(initialDraft);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(() =>
    preferredFieldId(initialDraft),
  );
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedField = useMemo(
    () => draft?.fields.find((field) => field.id === selectedFieldId) ?? null,
    [draft, selectedFieldId],
  );

  const unresolvedCriticalCount =
    draft?.fields.filter((field) => !isResolved(field)).length ?? 0;

  const readingModel = useMemo(() => {
    if (!bundle || !draft || bundle.module !== 'READING') return null;

    const hasQuestionMaterial = bundle.assignments.some(
      (assignment) => assignment.role === 'QUESTION_MATERIAL',
    );
    const hasAnswerKey = bundle.assignments.some(
      (assignment) => assignment.role === 'ANSWER_KEY',
    );

    if (!hasQuestionMaterial || !hasAnswerKey) return null;

    return buildReadingImportModel({
      bundle,
      draft,
      visualRegions: [],
    });
  }, [bundle, draft]);

  const showStructuredReadingReview =
    readingModel !== null && unresolvedCriticalCount === 0;
  const semanticBlockingCount =
    showStructuredReadingReview
      ? readingModel.semanticReviewItems.filter(
          (item) =>
            item.critical &&
            item.state !== 'VERIFIED' &&
            item.state !== 'CONFIRMED',
        ).length
      : 0;
  const activeBlockingCount = showStructuredReadingReview
    ? semanticBlockingCount
    : unresolvedCriticalCount;

  function createBundle(module: ImportModule, title: string) {
    const nowMs = Date.now();
    const nextBundle: ImportBundle = {
      id: createWorkspaceId(),
      module,
      title,
      sourceDocuments: [],
      assignments: [],
      status: 'COLLECTING_SOURCES',
      updatedAtMs: nowMs,
    };

    setBundle(nextBundle);
    setError(null);
    onBundleChange?.(nextBundle);
  }

  async function addFiles(files: File[]) {
    if (!bundle || files.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      let nextBundle = bundle;
      let nextDraft = draft;

      for (const file of files) {
        const imported = await processFile(file);
        const nowMs = Date.now();
        const existingIds = new Set(
          nextBundle.sourceDocuments.map((document) => document.id),
        );
        const newDocuments = imported.sourceDocuments.filter(
          (document) => !existingIds.has(document.id),
        );

        nextBundle = {
          ...nextBundle,
          sourceDocuments: [...nextBundle.sourceDocuments, ...newDocuments],
          updatedAtMs: nowMs,
        };

        nextDraft = mergeDraft(nextDraft, imported, nowMs);
      }

      setBundle(nextBundle);
      onBundleChange?.(nextBundle);

      if (nextDraft) {
        setDraft(nextDraft);
        setSelectedFieldId(preferredFieldId(nextDraft));
        onDraftChange?.(nextDraft);
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Unable to import these files';
      setError(message);
    } finally {
      setIsImporting(false);
    }
  }

  function assignRole(assignment: ImportSourceAssignment) {
    if (!bundle) return;

    try {
      const nextBundle = assignSourceRole(bundle, assignment, Date.now());
      setBundle(nextBundle);
      setError(null);
      onBundleChange?.(nextBundle);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to assign this source role',
      );
    }
  }

  function confirmField(value: string) {
    if (!draft || !selectedField) return;

    const nextDraft: ImportDraft = {
      ...draft,
      fields: draft.fields.map((field) =>
        field.id === selectedField.id
          ? {
              ...field,
              confirmedValue: value,
              verification: {
                ...field.verification,
                state: 'CONFIRMED',
              },
            }
          : field,
      ),
      updatedAtMs: Date.now(),
    };

    setDraft(nextDraft);
    onDraftChange?.(nextDraft);
  }

  return (
    <section className="import-workspace" aria-labelledby="import-workspace-title">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">Import / Review</p>
          <h1 id="import-workspace-title">Import test material</h1>
          <p className="page-subtitle">
            Choose the module, add all source material, assign source roles, then
            convert the verified material into a real runnable test.
          </p>
        </div>
        <span className="local-badge">Local-first review</span>
      </div>

      <ImportSourceManager
        bundle={bundle}
        onCreate={createBundle}
        onAddFiles={(files) => void addFiles(files)}
        onAssign={assignRole}
      />

      {isImporting ? (
        <div className="import-storage-status" role="status">
          Extracting source material…
        </div>
      ) : null}

      {error ? (
        <div className="import-error" role="alert">
          {error}
        </div>
      ) : null}

      {!draft ? (
        <div className="import-empty-state">
          <h2>No source loaded</h2>
          <p>
            Choose a module first, then add the question paper, answer key, and
            any other source files for the same test.
          </p>
        </div>
      ) : (
        <>
          <div className="import-summary-bar">
            <div>
              <span>Sources</span>
              <strong>
                {draft.sourceDocuments[0]?.name ?? 'Imported source'}
                {draft.sourceDocuments.length > 1
                  ? ` +${draft.sourceDocuments.length - 1} more`
                  : ''}
              </strong>
            </div>
            <div>
              <span>Fields</span>
              <strong>{draft.fields.length}</strong>
            </div>
            <div>
              <span>Blocking</span>
              <strong>{unresolvedCriticalCount}</strong>
            </div>
          </div>

          {showStructuredReadingReview ? (
            <section
              className="import-field-list"
              aria-labelledby="structured-reading-review-title"
            >
              <div className="import-panel-heading">
                <div>
                  <p className="page-eyebrow">Converted test structure</p>
                  <h2 id="structured-reading-review-title">
                    Structured Reading review
                  </h2>
                </div>
              </div>

              <div className="import-fields">
                {readingModel.semanticReviewItems.map((item) => (
                  <article key={item.id} className="import-field-card">
                    <div className="import-field-card-heading">
                      <strong>{item.label}</strong>
                      <VerificationBadge state={item.state} />
                    </div>
                    <p>{item.value ?? item.message ?? 'Review required'}</p>
                    <div className="import-field-card-footer">
                      <small>{item.critical ? 'Critical' : 'Non-critical'}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="import-review-layout">
              <section className="import-field-list" aria-labelledby="import-fields-title">
                <div className="import-panel-heading">
                  <div>
                    <p className="page-eyebrow">Extracted content</p>
                    <h2 id="import-fields-title">Fields to review</h2>
                  </div>
                </div>

                <div className="import-fields">
                  {draft.fields.map((field) => (
                    <article
                      key={field.id}
                      className={`import-field-card${
                        selectedFieldId === field.id ? ' selected' : ''
                      }`}
                    >
                      <div className="import-field-card-heading">
                        <strong>{field.kind}</strong>
                        <VerificationBadge state={field.verification.state} />
                      </div>
                      <p>{fieldPreview(field)}</p>
                      <div className="import-field-card-footer">
                        <small>{field.critical ? 'Critical' : 'Non-critical'}</small>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => setSelectedFieldId(field.id)}
                        >
                          {field.critical && !isResolved(field)
                            ? `Review & Confirm ${field.kind}`
                            : `View evidence ${field.kind}`}
                        </button>
                      </div>
                      {selectedFieldId === field.id &&
                      field.critical &&
                      !isResolved(field) ? (
                        <ConflictEditor
                          key={field.id}
                          field={field}
                          onConfirm={confirmField}
                        />
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <div className="import-review-detail">
                <SourceEvidencePane
                  field={selectedField}
                  sourceDocuments={draft.sourceDocuments}
                />
              </div>
            </div>
          )}

          <footer className="import-publish-bar">
            <div role="status">
              {activeBlockingCount === 0 ? (
                <strong>All critical imported fields are resolved</strong>
              ) : (
                <strong>
                  {activeBlockingCount} critical field
                  {activeBlockingCount === 1 ? '' : 's'} still{' '}
                  {activeBlockingCount === 1 ? 'requires' : 'require'} review
                </strong>
              )}
              <small>
                Publication stays blocked until every critical field is verified or
                explicitly confirmed.
              </small>
            </div>
            <button
              type="button"
              className="primary-action"
              disabled={activeBlockingCount > 0}
              onClick={() => draft && onPublish?.(draft)}
            >
              Publish imported test
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
