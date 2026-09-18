import { beforeEach, describe, expect, it } from 'vitest';
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
    expect(restored?.sourceDocuments[0].sourceBytes).toBeInstanceOf(ArrayBuffer);
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
});
