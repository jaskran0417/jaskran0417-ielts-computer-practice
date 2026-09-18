import { beforeEach, describe, expect, it } from 'vitest';
import type { ImportBundle } from '../bundle/domain';
import type { ImportDraft } from './import-repository';
import { IndexedDbImportRepository } from './indexeddb-import-repository';

const DATABASE_NAME = 'ielts-import-drafts-test';

function draft(overrides: Partial<ImportDraft> = {}): ImportDraft {
  return {
    id: 'draft-1',
    testId: 'test-1',
    sourceDocuments: [
      {
        id: 'doc-1',
        name: 'reading.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 2048,
        kind: 'PDF',
        createdAtMs: 1_000,
        sourceBytes: new TextEncoder().encode('original-pdf').buffer,
      },
    ],
    fields: [
      {
        id: 'field-1',
        kind: 'INSTRUCTION',
        critical: true,
        verification: {
          state: 'VERIFIED',
          normalizedValue: 'NO MORE THAN TWO WORDS',
          reasons: [],
        },
      },
    ],
    updatedAtMs: 2_000,
    ...overrides,
  };
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('IndexedDbImportRepository', () => {
  beforeEach(async () => {
    await deleteDatabase(DATABASE_NAME);
  });

  it('saves, loads, and deletes a complete import draft locally', async () => {
    const repository = new IndexedDbImportRepository(DATABASE_NAME);
    const original = draft();

    await repository.saveDraft(original);
    const restored = await repository.loadDraft(original.id);
    expect(restored).toEqual(original);
    expect(restored?.sourceDocuments[0].sourceBytes?.byteLength).toBeGreaterThan(0);
    expect(new TextDecoder().decode(restored?.sourceDocuments[0].sourceBytes)).toBe('original-pdf');

    await repository.deleteDraft(original.id);
    expect(await repository.loadDraft(original.id)).toBeNull();
  });

  it('replaces an existing draft atomically when it is saved again', async () => {
    const repository = new IndexedDbImportRepository(DATABASE_NAME);
    await repository.saveDraft(draft());

    const updated = draft({ updatedAtMs: 3_000, fields: [] });
    await repository.saveDraft(updated);

    expect(await repository.loadDraft(updated.id)).toEqual(updated);
  });

  it('lists drafts newest first without needing a network service', async () => {
    const repository = new IndexedDbImportRepository(DATABASE_NAME);
    await repository.saveDraft(draft({ id: 'older', updatedAtMs: 1_000 }));
    await repository.saveDraft(draft({ id: 'newer', updatedAtMs: 5_000 }));

    const drafts = await repository.listDrafts();

    expect(drafts.map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('round-trips a Reading bundle with one PDF split into question and answer page roles', async () => {
    const repository = new IndexedDbImportRepository(DATABASE_NAME);
    const original: ImportBundle = {
      id: 'bundle-1',
      module: 'READING',
      title: 'Reading Test 1',
      sourceDocuments: [
        {
          id: 'pdf-1',
          name: 'reading.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 123,
          kind: 'PDF',
          createdAtMs: 1,
          sourceBytes: new TextEncoder().encode('pdf-bytes').buffer,
        },
      ],
      assignments: [
        {
          sourceDocumentId: 'pdf-1',
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 12 }],
        },
        {
          sourceDocumentId: 'pdf-1',
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 13, endPage: 13 }],
        },
      ],
      status: 'COLLECTING_SOURCES',
      updatedAtMs: 2,
    };

    await repository.saveBundle(original);
    const restored = await repository.loadBundle(original.id);

    expect(restored).toEqual(original);
    expect(new TextDecoder().decode(restored?.sourceDocuments[0].sourceBytes)).toBe('pdf-bytes');

    await repository.deleteBundle(original.id);
    expect(await repository.loadBundle(original.id)).toBeNull();
  });
});
