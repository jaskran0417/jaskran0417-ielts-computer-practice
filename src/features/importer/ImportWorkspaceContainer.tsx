import { useEffect, useMemo, useState } from 'react';
import type { ImportBundle } from './bundle/domain';
import {
  ImportWorkspace,
  type ImportFileProcessor,
} from './ImportWorkspace';
import { IndexedDbImportRepository } from './local/indexeddb-import-repository';
import type { PreparedReadingPublication } from './publication/import-publication';
import { IndexedDbProtectedAnswerRepository } from '../../scoring/indexeddb-protected-answer-repository';
import { IndexedDbTestCatalog } from '../../test-catalog/indexeddb-test-catalog';
import { LocalImportedTestPublisher } from '../../test-catalog/local-imported-test-publisher';
import type {
  ImportDraft,
  ImportRepository,
} from './local/import-repository';
import {
  createLocalRegionProcessor,
  type ImportRegionProcessor,
} from './local-file-processor';

export interface ImportPublisher {
  publish(
    publication: PreparedReadingPublication,
  ): Promise<{ testId: string; versionId: string }>;
}

export interface ImportWorkspaceContainerProps {
  processFile: ImportFileProcessor;
  processRegion?: ImportRegionProcessor;
  repository?: ImportRepository;
  publisher?: ImportPublisher;
  onPublished?(): void | Promise<void>;
}

type LoadState =
  | { status: 'LOADING'; draft: null; bundle: null }
  | {
      status: 'READY';
      draft: ImportDraft | null;
      bundle: ImportBundle | null;
    };

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Unable to access local import storage';
}

export function ImportWorkspaceContainer({
  processFile,
  processRegion,
  repository,
  publisher,
  onPublished,
}: ImportWorkspaceContainerProps) {
  const defaultRepository = useMemo(() => new IndexedDbImportRepository(), []);
  const defaultRegionProcessor = useMemo(() => createLocalRegionProcessor(), []);
  const defaultCatalog = useMemo(() => new IndexedDbTestCatalog(), []);
  const defaultProtectedAnswers = useMemo(
    () => new IndexedDbProtectedAnswerRepository(),
    [],
  );
  const defaultPublisher = useMemo(
    () => new LocalImportedTestPublisher(defaultCatalog, defaultProtectedAnswers),
    [defaultCatalog, defaultProtectedAnswers],
  );
  const imports = repository ?? defaultRepository;
  const testPublisher = publisher ?? defaultPublisher;
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'LOADING',
    draft: null,
    bundle: null,
  });
  const [storageStatus, setStorageStatus] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([imports.listBundles(), imports.listDrafts()])
      .then(([bundles, drafts]) => {
        if (!cancelled) {
          setLoadState({
            status: 'READY',
            bundle: bundles[0] ?? null,
            draft: drafts[0] ?? null,
          });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setStorageError(errorMessage(cause));
          setLoadState({
            status: 'READY',
            draft: null,
            bundle: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imports]);

  function persistDraft(draft: ImportDraft) {
    setStorageError(null);
    setStorageStatus('Saving locally…');

    void imports
      .saveDraft(draft)
      .then(() => {
        setStorageStatus('Saved locally');
      })
      .catch((cause: unknown) => {
        setStorageStatus(null);
        setStorageError(errorMessage(cause));
      });
  }

  function persistBundle(bundle: ImportBundle) {
    setStorageError(null);
    setStorageStatus('Saving locally…');

    void imports
      .saveBundle(bundle)
      .then(() => {
        setStorageStatus('Saved locally');
      })
      .catch((cause: unknown) => {
        setStorageStatus(null);
        setStorageError(errorMessage(cause));
      });
  }


  async function clearSavedSources(draftId?: string) {
    if (!draftId) return;
    setStorageError(null);
    setStorageStatus('Clearing imported sources…');

    try {
      await imports.deleteDraft(draftId);
      setStorageStatus('Sources cleared');
    } catch (cause) {
      setStorageStatus(null);
      setStorageError(errorMessage(cause));
      throw cause;
    }
  }

  async function clearSavedImport(ids: { bundleId?: string; draftId?: string }) {
    setStorageError(null);
    setStorageStatus('Clearing local import…');

    try {
      const operations: Promise<void>[] = [];
      if (ids.bundleId) operations.push(imports.deleteBundle(ids.bundleId));
      if (ids.draftId) operations.push(imports.deleteDraft(ids.draftId));
      await Promise.all(operations);
      setStorageStatus('Import cleared');
    } catch (cause) {
      setStorageStatus(null);
      setStorageError(errorMessage(cause));
      throw cause;
    }
  }

  async function publishTest(publication: PreparedReadingPublication) {
    setStorageError(null);
    setStorageStatus('Publishing locally…');

    try {
      await testPublisher.publish(publication);
      setStorageStatus('Published locally');
      await onPublished?.();
    } catch (cause) {
      setStorageStatus(null);
      setStorageError(errorMessage(cause));
      throw cause;
    }
  }

  if (loadState.status === 'LOADING') {
    return (
      <section className="import-loading" aria-live="polite">
        Loading local import draft…
      </section>
    );
  }

  return (
    <>
      {storageStatus ? (
        <div className="import-storage-status" role="status">
          {storageStatus}
        </div>
      ) : null}
      {storageError ? (
        <div
          className="import-storage-error"
          role="alert"
          aria-label="Import storage error"
        >
          {storageError}
        </div>
      ) : null}
      <ImportWorkspace
        processFile={processFile}
        processRegion={processRegion ?? defaultRegionProcessor}
        initialDraft={loadState.draft}
        initialBundle={loadState.bundle}
        onDraftChange={persistDraft}
        onBundleChange={persistBundle}
        onPublish={publishTest}
        onClearImport={clearSavedImport}
        onClearSources={clearSavedSources}
      />
    </>
  );
}
