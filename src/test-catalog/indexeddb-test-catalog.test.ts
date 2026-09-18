import { beforeEach, describe, expect, it } from 'vitest';
import type { StudentTestPackage } from '../test-schema/types';
import { IndexedDbTestCatalog } from './indexeddb-test-catalog';

const DATABASE_NAME = 'ielts-test-catalog-test';

function pkg(versionId: string, title = 'Offline Reading'): StudentTestPackage {
  return {
    id: 'test-offline',
    versionId,
    title,
    durationSeconds: 3600,
    modules: [
      {
        id: `reading-${versionId}`,
        kind: 'READING',
        title: 'Reading',
        sections: [],
      },
    ],
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

describe('IndexedDbTestCatalog', () => {
  beforeEach(async () => {
    await deleteDatabase(DATABASE_NAME);
  });

  it('saves and loads a published package completely offline', async () => {
    const catalog = new IndexedDbTestCatalog(DATABASE_NAME);
    const test = pkg('version-1');

    await catalog.saveLocalTest(test);

    await expect(
      catalog.loadPublishedTest(test.id, test.versionId),
    ).resolves.toEqual(test);
    await expect(catalog.listPublishedTests()).resolves.toEqual([
      {
        testId: test.id,
        versionId: test.versionId,
        title: test.title,
        modules: ['READING'],
      },
    ]);
  });

  it('keeps immutable versions separately for the same test', async () => {
    const catalog = new IndexedDbTestCatalog(DATABASE_NAME);
    await catalog.saveLocalTest(pkg('version-1', 'Reading v1'));
    await catalog.saveLocalTest(pkg('version-2', 'Reading v2'));

    await expect(
      catalog.loadPublishedTest('test-offline', 'version-1'),
    ).resolves.toMatchObject({ versionId: 'version-1', title: 'Reading v1' });
    await expect(
      catalog.loadPublishedTest('test-offline', 'version-2'),
    ).resolves.toMatchObject({ versionId: 'version-2', title: 'Reading v2' });
  });
});
