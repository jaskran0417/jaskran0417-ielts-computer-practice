import { describe, expect, it } from 'vitest';
import type { StudentTestPackage } from '../test-schema/types';
import { SupabaseTestCatalog } from './supabase-test-catalog';

function pkg(id: string, versionId: string, title: string): StudentTestPackage {
  return {
    id,
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

describe('SupabaseTestCatalog', () => {
  it('lists only genuinely published test versions and keeps the newest version per test', async () => {
    const rows = [
      {
        id: 'version-2',
        test_id: 'test-1',
        version_number: 2,
        published_at: '2026-09-18T07:00:00Z',
        content: pkg('test-1', 'version-2', 'Reading Test'),
        tests: { id: 'test-1', title: 'Reading Test', status: 'published' },
      },
      {
        id: 'version-1',
        test_id: 'test-1',
        version_number: 1,
        published_at: '2026-09-17T07:00:00Z',
        content: pkg('test-1', 'version-1', 'Reading Test'),
        tests: { id: 'test-1', title: 'Reading Test', status: 'published' },
      },
      {
        id: 'version-draft',
        test_id: 'test-2',
        version_number: 1,
        published_at: null,
        content: pkg('test-2', 'version-draft', 'Draft Test'),
        tests: { id: 'test-2', title: 'Draft Test', status: 'draft' },
      },
    ];

    const source = {
      async listPublishedRows() {
        return { data: rows, error: null };
      },
      async loadPublishedRow() {
        return { data: null, error: null };
      },
    };

    const catalog = new SupabaseTestCatalog(source);
    await expect(catalog.listPublishedTests()).resolves.toEqual([
      {
        testId: 'test-1',
        versionId: 'version-2',
        title: 'Reading Test',
        modules: ['READING'],
      },
    ]);
  });

  it('refuses to load a row that is not actually published', async () => {
    const source = {
      async listPublishedRows() {
        return { data: [], error: null };
      },
      async loadPublishedRow() {
        return {
          data: {
            id: 'version-draft',
            test_id: 'test-2',
            published_at: null,
            content: pkg('test-2', 'version-draft', 'Draft Test'),
            tests: { status: 'draft' },
          },
          error: null,
        };
      },
    };

    const catalog = new SupabaseTestCatalog(source);
    await expect(
      catalog.loadPublishedTest('test-2', 'version-draft'),
    ).rejects.toThrow('Published test version not found');
  });
});
