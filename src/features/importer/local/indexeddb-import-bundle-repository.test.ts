import { beforeEach, describe, expect, it } from 'vitest';
import type { ImportBundle } from '../bundle/types';
import { IndexedDbImportBundleRepository } from './indexeddb-import-bundle-repository';

const DATABASE_NAME = 'ielts-import-bundles-test';

function bundle(overrides: Partial<ImportBundle> = {}): ImportBundle {
  return {
    id: 'bundle-1',
    testId: 'test-1',
    module: 'READING',
    title: 'Reading Test 1',
    sourceDocuments: [
      {
        id: 'doc-questions',
        name: 'reading.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 2048,
        kind: 'PDF',
        createdAtMs: 1_000,
        sourceBytes: new TextEncoder().encode('%PDF-question-source').buffer,
      },
      {
        id: 'doc-answers',
        name: 'answers.png',
        mediaType: 'image/png',
        sizeBytes: 512,
        kind: 'IMAGE',
        createdAtMs: 1_100,
        sourceBytes: new TextEncoder().encode('answer-image-bytes').buffer,
      },
    ],
    extractedFields: [],
    assignments: [
      {
        id: 'questions-role',
        documentId: 'doc-questions',
        role: 'QUESTION_MATERIAL',
        pageRanges: [{ startPage: 1, endPage: 12 }],
        requiredForPublication: true,
      },
      {
        id: 'answers-role',
        documentId: 'doc-questions',
        role: 'ANSWER_KEY',
        pageRanges: [{ startPage: 13, endPage: 13 }],
        requiredForPublication: true,
      },
      {
        id: 'support-role',
        documentId: 'doc-answers',
        role: 'SUPPORTING_EVIDENCE',
        pageRanges: [{ startPage: 1, endPage: 1 }],
        requiredForPublication: false,
      },
    ],
    structuredDraft: null,
    status: 'COLLECTING_SOURCES',
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

describe('IndexedDbImportBundleRepository', () => {
  beforeEach(async () => {
    await deleteDatabase(DATABASE_NAME);
  });

  it('round-trips multiple source documents and page assignments', async () => {
    const repository = new IndexedDbImportBundleRepository(DATABASE_NAME);
    const original = bundle();

    await repository.saveBundle(original);
    const restored = await repository.loadBundle(original.id);

    expect(restored).toEqual(original);
    expect(restored?.sourceDocuments).toHaveLength(2);
    expect(restored?.assignments).toHaveLength(3);
    expect(
      new TextDecoder().decode(restored?.sourceDocuments[0].sourceBytes),
    ).toBe('%PDF-question-source');
  });

  it('replaces the same bundle id and lists newest bundles first', async () => {
    const repository = new IndexedDbImportBundleRepository(DATABASE_NAME);

    await repository.saveBundle(bundle({ id: 'older', updatedAtMs: 1_000 }));
    await repository.saveBundle(bundle({ id: 'newer', updatedAtMs: 5_000 }));
    await repository.saveBundle(
      bundle({ id: 'older', title: 'Updated older', updatedAtMs: 6_000 }),
    );

    const bundles = await repository.listBundles();

    expect(bundles.map((item) => item.id)).toEqual(['older', 'newer']);
    expect(bundles[0].title).toBe('Updated older');
  });

  it('deletes a bundle locally', async () => {
    const repository = new IndexedDbImportBundleRepository(DATABASE_NAME);
    await repository.saveBundle(bundle());

    await repository.deleteBundle('bundle-1');

    expect(await repository.loadBundle('bundle-1')).toBeNull();
  });
});
