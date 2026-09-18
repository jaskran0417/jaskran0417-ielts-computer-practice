import { useMemo, useState, type ChangeEvent } from 'react';
import type { ImportDraft, ImportFieldRecord } from './local/import-repository';
import { ConflictEditor } from './components/ConflictEditor';
import { SourceEvidencePane } from './components/SourceEvidencePane';
import { VerificationBadge } from './components/VerificationBadge';
import './import-workspace.css';

export type ImportFileProcessor = (file: File) => Promise<ImportDraft>;

export interface ImportWorkspaceProps {
  processFile: ImportFileProcessor;
  initialDraft?: ImportDraft | null;
  onDraftChange?(draft: ImportDraft): void;
  onPublish?(draft: ImportDraft): void;
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

export function ImportWorkspace({
  processFile,
  initialDraft = null,
  onDraftChange,
  onPublish,
}: ImportWorkspaceProps) {
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

  const unresolvedCriticalCount = draft?.fields.filter((field) => !isResolved(field)).length ?? 0;

  async function importFile(file: File) {
    setIsImporting(true);
    setError(null);
    try {
      const nextDraft = await processFile(file);
      setDraft(nextDraft);
      setSelectedFieldId(preferredFieldId(nextDraft));
      onDraftChange?.(nextDraft);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to import this file';
      setError(message);
      setDraft(null);
      setSelectedFieldId(null);
    } finally {
      setIsImporting(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void importFile(file);
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
            Bring in local source material, inspect the extraction evidence, and explicitly resolve
            uncertain critical content before publication.
          </p>
        </div>
        <span className="local-badge">Local-first review</span>
      </div>

      <div className="import-upload-card">
        <label className="import-file-control">
          <span>Choose source file</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.docx,audio/*"
            onChange={handleFileChange}
            disabled={isImporting}
          />
        </label>
        <div className="import-upload-copy">
          <strong>{isImporting ? 'Importing…' : 'PDF, image, answer key, or audio source'}</strong>
          <small>Original evidence stays attached to the draft. Uncertain critical fields never publish silently.</small>
        </div>
      </div>

      {error ? <div className="import-error" role="alert">{error}</div> : null}

      {!draft ? (
        <div className="import-empty-state">
          <h2>No source loaded</h2>
          <p>Choose a local file to start an evidence-backed import draft.</p>
        </div>
      ) : (
        <>
          <div className="import-summary-bar">
            <div>
              <span>Source</span>
              <strong>{draft.sourceDocuments[0]?.name ?? 'Imported source'}</strong>
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
                    className={`import-field-card${selectedFieldId === field.id ? ' selected' : ''}`}
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
                        Review {field.kind}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="import-review-detail">
              <SourceEvidencePane
                field={selectedField}
                sourceDocuments={draft.sourceDocuments}
              />
              {selectedField && selectedField.critical && !isResolved(selectedField) ? (
                <ConflictEditor key={selectedField.id} field={selectedField} onConfirm={confirmField} />
              ) : null}
            </div>
          </div>

          <footer className="import-publish-bar">
            <div role="status">
              {unresolvedCriticalCount === 0 ? (
                <strong>All critical imported fields are resolved</strong>
              ) : (
                <strong>
                  {unresolvedCriticalCount} critical field{unresolvedCriticalCount === 1 ? '' : 's'} still{' '}
                  {unresolvedCriticalCount === 1 ? 'requires' : 'require'} review
                </strong>
              )}
              <small>Publication stays blocked until every critical field is verified or explicitly confirmed.</small>
            </div>
            <button
              type="button"
              className="primary-action"
              disabled={unresolvedCriticalCount > 0}
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
