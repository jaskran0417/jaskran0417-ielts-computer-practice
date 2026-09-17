import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { ConflictEditor } from './components/ConflictEditor';
import { SourceEvidencePane } from './components/SourceEvidencePane';
import { VerificationBadge } from './components/VerificationBadge';
import type { ImportDraft, ImportFieldRecord } from './local/import-repository';

export interface ImportWorkspaceProps {
  processFile(file: File): Promise<ImportDraft>;
  onPublish?(draft: ImportDraft): void;
}

function previewValue(field: ImportFieldRecord): string {
  if (field.verification.state === 'CONFIRMED') {
    return field.confirmedValue ?? 'Confirmed';
  }

  if (field.verification.state === 'VERIFIED') {
    return field.verification.normalizedValue ?? 'Verified';
  }

  return field.verification.reasons[0] ?? 'Manual review required';
}

function unresolvedCriticalCount(draft: ImportDraft | null): number {
  if (!draft) return 0;

  return draft.fields.filter(
    (field) =>
      field.critical &&
      field.verification.state !== 'VERIFIED' &&
      field.verification.state !== 'CONFIRMED',
  ).length;
}

export function ImportWorkspace({ processFile, onPublish }: ImportWorkspaceProps) {
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unresolvedCount = unresolvedCriticalCount(draft);
  const selectedField = useMemo(
    () => draft?.fields.find((field) => field.id === selectedFieldId) ?? null,
    [draft, selectedFieldId],
  );

  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const nextDraft = await processFile(file);
      setDraft(nextDraft);
      setSelectedFieldId(null);
    } catch (cause) {
      setDraft(null);
      setSelectedFieldId(null);
      setError(cause instanceof Error ? cause.message : 'The source could not be imported.');
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) void importFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void importFile(file);
  }

  function confirmField(fieldId: string, value: string) {
    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        updatedAtMs: Date.now(),
        fields: current.fields.map((field) =>
          field.id === fieldId
            ? {
                ...field,
                confirmedValue: value,
                verification: {
                  ...field.verification,
                  state: 'CONFIRMED' as const,
                  normalizedValue: field.verification.normalizedValue,
                  reasons: [],
                },
              }
            : field,
        ),
      };
    });
  }

  return (
    <section className="import-workspace" aria-labelledby="import-workspace-title">
      <header className="import-header">
        <div>
          <p className="page-eyebrow">Import / Review</p>
          <h1 id="import-workspace-title">Import and verify test material</h1>
          <p className="page-subtitle">
            Add local source material, inspect extraction evidence, and explicitly resolve uncertainty before publishing.
          </p>
        </div>
        <div className="import-readiness" aria-live="polite">
          <span className={`status-dot${unresolvedCount > 0 ? ' warning' : ''}`} aria-hidden="true" />
          <span>
            <strong>{draft ? (unresolvedCount === 0 ? 'Ready for publication review' : 'Review required') : 'Waiting for source'}</strong>
            {draft ? (
              <small>
                {unresolvedCount === 0
                  ? 'All critical fields are resolved'
                  : `Resolve ${unresolvedCount} critical field${unresolvedCount === 1 ? '' : 's'} before publishing`}
              </small>
            ) : (
              <small>Nothing is published automatically</small>
            )}
          </span>
        </div>
      </header>

      <div
        className="import-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div>
          <strong>{busy ? 'Reading source…' : 'Add source material'}</strong>
          <p>PDF, image, answer-key, or other supported local files remain under review until verified.</p>
        </div>
        <label className="secondary-action file-picker">
          <span>{busy ? 'Processing…' : 'Choose source file'}</span>
          <input
            className="sr-only"
            type="file"
            aria-label="Choose source file"
            disabled={busy}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {error ? <p className="import-error" role="alert">{error}</p> : null}

      {draft ? (
        <>
          <div className="source-summary" aria-label="Imported sources">
            {draft.sourceDocuments.map((document) => (
              <span className="source-document-chip" key={document.id}>
                <strong>{document.name}</strong>
                <small>{document.kind} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB</small>
              </span>
            ))}
          </div>

          <div className="import-review-grid">
            <section className="verification-list" aria-labelledby="verification-fields-title">
              <div className="pane-heading">
                <div>
                  <p className="page-eyebrow">Extracted content</p>
                  <h2 id="verification-fields-title">Verification fields</h2>
                </div>
                <span className="field-id-chip">{draft.fields.length} fields</span>
              </div>

              <div className="verification-rows">
                {draft.fields.map((field) => (
                  <article
                    className={`verification-row${field.id === selectedFieldId ? ' selected' : ''}`}
                    data-testid={`import-field-${field.id}`}
                    key={field.id}
                  >
                    <div className="verification-row-main">
                      <div className="verification-row-heading">
                        <span className="field-kind">{field.kind.replace(/_/g, ' ')}</span>
                        <VerificationBadge state={field.verification.state} />
                      </div>
                      <strong className="field-key">{field.id}</strong>
                      <p>{previewValue(field)}</p>
                    </div>
                    <button
                      className="text-action"
                      type="button"
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      Review {field.id}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <aside className="review-detail" aria-label="Field review detail">
              {selectedField ? (
                <>
                  <SourceEvidencePane field={selectedField} documents={draft.sourceDocuments} />
                  {selectedField.verification.state === 'REVIEW_REQUIRED' ||
                  selectedField.verification.state === 'UNREADABLE' ? (
                    <ConflictEditor
                      field={selectedField}
                      onConfirm={(value) => confirmField(selectedField.id, value)}
                    />
                  ) : null}
                </>
              ) : (
                <div className="review-placeholder">
                  <p className="page-eyebrow">Review detail</p>
                  <h2>Select a field</h2>
                  <p>Open a field to inspect its source evidence and resolve any conflict.</p>
                </div>
              )}
            </aside>
          </div>

          <footer className="import-publish-bar">
            <div role="status">
              <strong>
                {unresolvedCount === 0
                  ? 'Critical verification complete'
                  : `${unresolvedCount} critical field${unresolvedCount === 1 ? '' : 's'} still need${unresolvedCount === 1 ? 's' : ''} review`}
              </strong>
              <span>Publication remains blocked until every critical field is VERIFIED or CONFIRMED.</span>
            </div>
            <button
              className="primary-action"
              type="button"
              disabled={unresolvedCount > 0}
              onClick={() => onPublish?.(draft)}
            >
              Publish imported test
            </button>
          </footer>
        </>
      ) : (
        <section className="import-empty-state">
          <strong>No source loaded</strong>
          <p>Choose a file above. The original evidence stays separate from the student-safe test payload.</p>
        </section>
      )}
    </section>
  );
}
