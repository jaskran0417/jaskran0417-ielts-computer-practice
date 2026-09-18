import { useEffect, useMemo, useState } from 'react';
import type { ImportBundle } from './bundle/domain';
import {
  ImportWorkspace,
  type ImportFileProcessor,
} from './ImportWorkspace';
import { IndexedDbImportRepository } from './local/indexeddb-import-repository';
import type {
  ImportDraft,
  ImportRepository,
} from './local/import-repository';

export interface ImportWorkspaceContainerProps {
  processFile: ImportFileProcessor;
  repository?: ImportRepository;
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
  repository,
}: ImportWorkspaceContainerProps) {
  const defaultRepository = useMemo(() => new IndexedDbImportRepository(), []);
  const imports = repository ?? defaultRepository;
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
        initialDraft={loadState.draft}
        initialBundle={loadState.bundle}
        onDraftChange={persistDraft}
        onBundleChange={persistBundle}
      />
    </>
  );
}
