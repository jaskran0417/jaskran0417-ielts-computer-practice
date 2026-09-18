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
import { SemanticAnswerEditor } from './components/SemanticAnswerEditor';
import { SemanticStructureEditor } from './components/SemanticStructureEditor';
import { VisualAnchorEditor } from './components/VisualAnchorEditor';
import { ImportSourceManager } from './components/ImportSourceManager';
import { SourceEvidencePane } from './components/SourceEvidencePane';
import { VerificationBadge } from './components/VerificationBadge';
import type { ImportDraft, ImportFieldRecord } from './local/import-repository';
import { buildReadingImportModel } from './reading/reading-import-converter';
import {
  prepareReadingPublication,
  type PreparedReadingPublication,
} from './publication/import-publication';
import type { MediaAsset } from '../../test-schema/types';
import './import-workspace.css';

export type ImportFileProcessor = (file: File) => Promise<ImportDraft>;

export interface ImportWorkspaceProps {
  processFile: ImportFileProcessor;
  initialDraft?: ImportDraft | null;
  initialBundle?: ImportBundle | null;
  onDraftChange?(draft: ImportDraft): void;
  onBundleChange?(bundle: ImportBundle): void;
  onPublish?(publication: PreparedReadingPublication): void | Promise<void>;
  onClearImport?(ids: { bundleId?: string; draftId?: string }): void | Promise<void>;
  onClearSources?(draftId?: string): void | Promise<void>;
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

function fieldBelongsToSource(field: ImportFieldRecord, sourceDocumentId: string): boolean {
  return (
    field.verification.passA?.evidence.documentId === sourceDocumentId ||
    field.verification.passB?.evidence.documentId === sourceDocumentId
  );
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
    visualAssets: [
      ...(current.visualAssets ?? []),
      ...(imported.visualAssets ?? []),
    ],
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
  onClearImport,
  onClearSources,
}: ImportWorkspaceProps) {
  const [bundle, setBundle] = useState<ImportBundle | null>(initialBundle);
  const [draft, setDraft] = useState<ImportDraft | null>(initialDraft);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(() =>
    preferredFieldId(initialDraft),
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [expandedSemanticItemId, setExpandedSemanticItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedField = useMemo(
    () => draft?.fields.find((field) => field.id === selectedFieldId) ?? null,
    [draft, selectedFieldId],
  );

  const unresolvedCriticalCount =
    draft?.fields.filter((field) => !isResolved(field)).length ?? 0;

  const hasQuestionMaterial =
    bundle?.assignments.some((assignment) => assignment.role === 'QUESTION_MATERIAL') ?? false;
  const hasAnswerKey =
    bundle?.assignments.some((assignment) => assignment.role === 'ANSWER_KEY') ?? false;
  const scoringMode = bundle?.scoringMode ?? 'AUTO';

  const readingModel = useMemo(() => {
    if (!bundle || !draft || bundle.module !== 'READING') return null;

    if (!hasQuestionMaterial) return null;

    const visualRegions = (draft.visualAssets ?? []).map((asset) => ({
      id: asset.id,
      sourceDocumentId: asset.sourceDocumentId,
      pageNumber: asset.pageNumber,
      kind: asset.kind,
      crop: asset.crop,
    }));

    return buildReadingImportModel({
      bundle,
      draft,
      visualRegions,
    });
  }, [bundle, draft, hasQuestionMaterial]);

  const sourceBlockingCount =
    readingModel?.sourceBlockingFieldIds.length ?? unresolvedCriticalCount;
  const showStructuredReadingReview =
    readingModel !== null && sourceBlockingCount === 0;
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
    : sourceBlockingCount;

  const publishStatus = (() => {
    if (!hasQuestionMaterial) {
      return {
        title: 'Question material required',
        detail: 'Assign the source or PDF pages that contain the Reading passages and questions.',
      };
    }
    if (scoringMode === 'AUTO' && !hasAnswerKey) {
      return {
        title: 'Answer key required for automatic scoring',
        detail: 'Assign an answer-key source/page, or choose teacher/manual scoring or unscored practice.',
      };
    }
    if (activeBlockingCount > 0) {
      return {
        title: `${activeBlockingCount} critical field${activeBlockingCount === 1 ? '' : 's'} still ${activeBlockingCount === 1 ? 'requires' : 'require'} review`,
        detail: 'Publication stays blocked until every required critical field is verified or explicitly confirmed.',
      };
    }
    if (!readingModel?.canPublish) {
      return {
        title: 'Test structure is not ready to publish',
        detail: 'Review the converted Reading structure and resolve any remaining publication blockers.',
      };
    }
    return {
      title: 'Ready to publish',
      detail:
        scoringMode === 'AUTO'
          ? 'All required question material and protected answers are resolved.'
          : scoringMode === 'MANUAL'
            ? 'This test will publish for teacher/manual scoring; an answer key is optional.'
            : 'This test will publish as unscored practice; an answer key is optional.',
    };
  })();

  function createBundle(module: ImportModule, title: string) {
    const nowMs = Date.now();
    const nextBundle: ImportBundle = {
      id: createWorkspaceId(),
      module,
      title,
      sourceDocuments: [],
      assignments: [],
      ...(module === 'READING' ? { scoringMode: 'AUTO' as const } : {}),
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
        const duplicateSource = nextBundle.sourceDocuments.some(
          (source) =>
            source.name === file.name &&
            source.sizeBytes === file.size &&
            source.mediaType === (file.type || 'application/octet-stream'),
        );
        if (duplicateSource) continue;

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

  function removeSource(sourceDocumentId: string) {
    if (!bundle) return;
    const nowMs = Date.now();
    const nextBundle: ImportBundle = {
      ...bundle,
      sourceDocuments: bundle.sourceDocuments.filter((source) => source.id !== sourceDocumentId),
      assignments: bundle.assignments.filter((assignment) => assignment.sourceDocumentId !== sourceDocumentId),
      updatedAtMs: nowMs,
    };
    const nextDraft = draft
      ? {
          ...draft,
          sourceDocuments: draft.sourceDocuments.filter((source) => source.id !== sourceDocumentId),
          fields: draft.fields.filter((field) => !fieldBelongsToSource(field, sourceDocumentId)),
          visualAssets: (draft.visualAssets ?? []).filter((asset) => asset.sourceDocumentId !== sourceDocumentId),
          updatedAtMs: nowMs,
        }
      : null;

    setBundle(nextBundle);
    setDraft(nextDraft);
    setSelectedFieldId(preferredFieldId(nextDraft));
    setError(null);
    onBundleChange?.(nextBundle);
    if (nextDraft) onDraftChange?.(nextDraft);
  }

  function removeAssignment(index: number) {
    if (!bundle) return;
    const nextBundle: ImportBundle = {
      ...bundle,
      assignments: bundle.assignments.filter((_, assignmentIndex) => assignmentIndex !== index),
      updatedAtMs: Date.now(),
    };
    setBundle(nextBundle);
    setError(null);
    onBundleChange?.(nextBundle);
  }


  async function clearSources() {
    if (!bundle || bundle.sourceDocuments.length === 0) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Clear all imported source files and assignments for this test?')
    ) {
      return;
    }

    const draftId = draft?.id;
    const nextBundle: ImportBundle = {
      ...bundle,
      sourceDocuments: [],
      assignments: [],
      semanticConfirmations: {},
      visualAnchorConfirmations: {},
      status: 'COLLECTING_SOURCES',
      updatedAtMs: Date.now(),
    };

    setBundle(nextBundle);
    setDraft(null);
    setSelectedFieldId(null);
    setExpandedSemanticItemId(null);
    setError(null);
    onBundleChange?.(nextBundle);

    try {
      await onClearSources?.(draftId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to clear imported sources',
      );
    }
  }

  async function clearImport() {
    const ids = {
      ...(bundle?.id ? { bundleId: bundle.id } : {}),
      ...(draft?.id ? { draftId: draft.id } : {}),
    };
    setBundle(null);
    setDraft(null);
    setSelectedFieldId(null);
    setExpandedSemanticItemId(null);
    setError(null);

    try {
      await onClearImport?.(ids);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to clear the saved import',
      );
    }
  }

  function changeScoringMode(mode: 'AUTO' | 'MANUAL' | 'UNSCORED') {
    if (!bundle) return;
    const nextBundle: ImportBundle = {
      ...bundle,
      scoringMode: mode,
      updatedAtMs: Date.now(),
    };
    setBundle(nextBundle);
    setError(null);
    onBundleChange?.(nextBundle);
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

  function confirmSemanticAnswer(itemId: string, value: string) {
    if (!bundle) return;
    const nextBundle: ImportBundle = {
      ...bundle,
      semanticConfirmations: {
        ...(bundle.semanticConfirmations ?? {}),
        [itemId]: value,
      },
      updatedAtMs: Date.now(),
    };
    setBundle(nextBundle);
    setExpandedSemanticItemId(null);
    onBundleChange?.(nextBundle);
  }

  function confirmVisualAnchor(questionNumber: number, anchor: { x: number; y: number; width: number; height: number }) {
    if (!bundle) return;
    const nextBundle: ImportBundle = {
      ...bundle,
      visualAnchorConfirmations: {
        ...(bundle.visualAnchorConfirmations ?? {}),
        [`q-${questionNumber}`]: anchor,
      },
      updatedAtMs: Date.now(),
    };
    setBundle(nextBundle);
    setExpandedSemanticItemId(null);
    onBundleChange?.(nextBundle);
  }

  async function publishReadingTest() {
    if (!bundle || !draft || !readingModel || activeBlockingCount > 0 || !onPublish) {
      return;
    }

    const visualAssets = Object.fromEntries(
      (draft.visualAssets ?? []).map((asset) => [
        asset.id,
        {
          id: asset.id,
          url: asset.dataUrl,
          alt: `Imported source visual from page ${asset.pageNumber}`,
          kind: 'IMAGE',
        } satisfies MediaAsset,
      ]),
    );

    const prepared = prepareReadingPublication({
      testId: bundle.id,
      versionId: createWorkspaceId(),
      structuredDraft: readingModel.structuredDraft,
      answerCoverage: readingModel.answerCoverage,
      reviewItems: readingModel.semanticReviewItems,
      visualAnchors: readingModel.visualAnchors,
      visualAssets,
      scoringMode,
    });

    if (!prepared.ok) {
      setError(prepared.reasons.join('. '));
      return;
    }

    setIsPublishing(true);
    setError(null);
    try {
      await onPublish(prepared.value);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to publish imported test',
      );
    } finally {
      setIsPublishing(false);
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
        onRemoveSource={removeSource}
        onRemoveAssignment={removeAssignment}
        onClearImport={() => void clearImport()}
        onClearSources={() => void clearSources()}
        onScoringModeChange={changeScoringMode}
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
              <strong>{activeBlockingCount}</strong>
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
                {readingModel.semanticReviewItems.map((item) => {
                  const visualAnchor = item.questionNumber
                    ? readingModel.visualAnchors.find(
                        (anchor) => anchor.questionNumber === item.questionNumber,
                      )
                    : undefined;
                  const visualAsset = visualAnchor
                    ? draft.visualAssets?.find(
                        (asset) => asset.id === visualAnchor.visualRegionId,
                      )
                    : undefined;
                  const expanded = expandedSemanticItemId === item.id;
                  const requiresReview =
                    item.critical &&
                    item.state !== 'VERIFIED' &&
                    item.state !== 'CONFIRMED';

                  return (
                    <article key={item.id} className="import-field-card">
                      <div className="import-field-card-heading">
                        <strong>{item.label}</strong>
                        <div className="import-field-card-heading-actions">
                          {requiresReview &&
                          (item.kind === 'QUESTION_TEXT' || item.kind === 'OPTION_LIST') ? (
                            <button
                              type="button"
                              className="secondary-action import-review-action"
                              aria-label={`Review & Confirm ${item.label}`}
                              onClick={() =>
                                setExpandedSemanticItemId(expanded ? null : item.id)
                              }
                            >
                              Review & Confirm
                            </button>
                          ) : null}
                          {requiresReview && item.kind === 'ANSWER_DEFINITION' ? (
                            <button
                              type="button"
                              className="secondary-action import-review-action"
                              aria-label={`Review & Confirm ${item.label}`}
                              onClick={() =>
                                setExpandedSemanticItemId(expanded ? null : item.id)
                              }
                            >
                              Review & Confirm
                            </button>
                          ) : null}
                          {requiresReview &&
                          item.kind === 'VISUAL_ANCHOR' &&
                          item.questionNumber &&
                          visualAsset ? (
                            <button
                              type="button"
                              className="secondary-action import-review-action"
                              aria-label={`Set position for Question ${item.questionNumber}`}
                              onClick={() =>
                                setExpandedSemanticItemId(expanded ? null : item.id)
                              }
                            >
                              Set position
                            </button>
                          ) : null}
                          <VerificationBadge state={item.state} />
                        </div>
                      </div>
                      {expanded &&
                      (item.kind === 'QUESTION_TEXT' || item.kind === 'OPTION_LIST') ? (
                        <SemanticStructureEditor
                          kind={item.kind}
                          initialValue={item.value ?? ''}
                          onConfirm={(value) => confirmSemanticAnswer(item.id, value)}
                        />
                      ) : null}
                      {expanded && item.kind === 'ANSWER_DEFINITION' ? (
                        <SemanticAnswerEditor
                          initialValue={item.value ?? ''}
                          onConfirm={(value) => confirmSemanticAnswer(item.id, value)}
                        />
                      ) : null}
                      {expanded &&
                      item.kind === 'VISUAL_ANCHOR' &&
                      item.questionNumber &&
                      visualAsset ? (
                        <VisualAnchorEditor
                          questionNumber={item.questionNumber}
                          imageUrl={visualAsset.dataUrl}
                          initialAnchor={
                            bundle?.visualAnchorConfirmations?.[`q-${item.questionNumber}`]
                          }
                          onConfirm={(anchor) =>
                            confirmVisualAnchor(item.questionNumber!, anchor)
                          }
                        />
                      ) : null}
                      <p>{item.value ?? item.message ?? 'Review required'}</p>
                      <div className="import-field-card-footer">
                        <small>{item.critical ? 'Critical' : 'Non-critical'}</small>
                      </div>
                    </article>
                  );
                })}
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
                        <div className="import-field-card-heading-actions">
                          {field.critical && !isResolved(field) ? (
                            <button
                              type="button"
                              className="secondary-action import-review-action"
                              aria-label={`Review & Confirm ${field.kind}`}
                              onClick={() => setSelectedFieldId(field.id)}
                            >
                              Review & Confirm
                            </button>
                          ) : null}
                          <VerificationBadge state={field.verification.state} />
                        </div>
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
                      <p>{fieldPreview(field)}</p>
                      <div className="import-field-card-footer">
                        <small>{field.critical ? 'Critical' : 'Non-critical'}</small>
                        {!field.critical || isResolved(field) ? (
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={() => setSelectedFieldId(field.id)}
                          >
                            View evidence {field.kind}
                          </button>
                        ) : null}
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
              </div>
            </div>
          )}

          <footer className="import-publish-bar">
            <div role="status">
              <strong>{publishStatus.title}</strong>
              <small>{publishStatus.detail}</small>
            </div>
            <button
              type="button"
              className="primary-action"
              disabled={
                activeBlockingCount > 0 ||
                isPublishing ||
                !readingModel ||
                !readingModel.canPublish ||
                !onPublish
              }
              onClick={() => void publishReadingTest()}
            >
              {isPublishing ? 'Publishing…' : 'Publish imported test'}
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
