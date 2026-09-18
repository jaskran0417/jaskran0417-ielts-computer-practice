import { useEffect, useMemo, useState } from 'react';
import {
  ImportWorkspace,
  type ImportFileProcessor,
} from './ImportWorkspace';
import type {
  ImportBundle,
  ImportModule,
  ImportSourceRole,
  PageRange,
} from './bundle/types';
import { IndexedDbImportBundleRepository } from './local/indexeddb-import-bundle-repository';
import type { ImportBundleRepository } from './local/import-bundle-repository';

export interface ImportWorkspaceContainerProps {
  processFile: ImportFileProcessor;
  repository?: ImportBundleRepository;
  now?: () => number;
  createId?: () => string;
}

type LoadState =
  | { status: 'LOADING'; bundle: null }
  | { status: 'READY'; bundle: ImportBundle | null };

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Unable to access local import storage';
}

function defaultCreateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function ImportWorkspaceContainer({
  processFile,
  repository,
  now = Date.now,
  createId = defaultCreateId,
}: ImportWorkspaceContainerProps) {
  const defaultRepository = useMemo(() => new IndexedDbImportBundleRepository(), []);
  const imports = repository ?? defaultRepository;
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'LOADING',
    bundle: null,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [storageStatus, setStorageStatus] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void imports
      .listBundles()
      .then((bundles) => {
        if (!cancelled) {
          setLoadState({
            status: 'READY',
            bundle: bundles[0] ?? null,
          });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setStorageError(errorMessage(cause));
          setLoadState({ status: 'READY', bundle: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imports]);

  function persistBundle(bundle: ImportBundle) {
    setStorageError(null);
    setStorageStatus('Saving locally…');

    void imports
      .saveBundle(bundle)
      .then(() => setStorageStatus('Saved locally'))
      .catch((cause: unknown) => {
        setStorageStatus(null);
        setStorageError(errorMessage(cause));
      });
  }

  function setAndPersist(bundle: ImportBundle) {
    setLoadState({ status: 'READY', bundle });
    persistBundle(bundle);
  }

  function createBundle(module: ImportModule, title: string) {
    const createdAtMs = now();
    const bundleId = createId();
    const testId = createId();
    const next: ImportBundle = {
      id: bundleId,
      testId,
      module,
      title,
      sourceDocuments: [],
      assignments: [],
      structuredDraft: null,
      status: 'COLLECTING_SOURCES',
      updatedAtMs: createdAtMs,
    };

    setAndPersist(next);
  }

  async function addSource(file: File) {
    if (loadState.status !== 'READY' || !loadState.bundle) return;

    setIsImporting(true);
    setOperationError(null);

    try {
      const extracted = await processFile(file);
      const sources = extracted.sourceDocuments;

      if (sources.length === 0) {
        throw new Error('The selected file produced no source document');
      }

      const next: ImportBundle = {
        ...loadState.bundle,
        sourceDocuments: [...loadState.bundle.sourceDocuments, ...sources],
        updatedAtMs: now(),
      };
      setAndPersist(next);
    } catch (cause) {
      setOperationError(errorMessage(cause));
    } finally {
      setIsImporting(false);
    }
  }

  function assignSourceRole(input: {
    documentId: string;
    role: ImportSourceRole;
    pageRanges: PageRange[];
  }) {
    if (loadState.status !== 'READY' || !loadState.bundle) return;

    const next: ImportBundle = {
      ...loadState.bundle,
      assignments: [
        ...loadState.bundle.assignments,
        {
          id: `${input.documentId}-${input.role}-${createId()}`,
          documentId: input.documentId,
          role: input.role,
          pageRanges: input.pageRanges,
          requiredForPublication:
            input.role !== 'SUPPORTING_EVIDENCE' &&
            input.role !== 'STAFF_MARKING_GUIDE',
        },
      ],
      updatedAtMs: now(),
    };

    setAndPersist(next);
  }

  function startStructuring() {
    if (loadState.status !== 'READY' || !loadState.bundle) return;
    setAndPersist({
      ...loadState.bundle,
      status: 'STRUCTURING',
      updatedAtMs: now(),
    });
  }

  if (loadState.status === 'LOADING') {
    return (
      <section className="import-loading" aria-live="polite">
        Loading local import bundle…
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
        bundle={loadState.bundle}
        isImporting={isImporting}
        error={operationError}
        onCreateBundle={createBundle}
        onAddSource={addSource}
        onAssignSourceRole={assignSourceRole}
        onStructure={startStructuring}
      />
    </>
  );
}
