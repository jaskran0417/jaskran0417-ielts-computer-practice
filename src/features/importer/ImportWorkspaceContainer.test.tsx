import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportBundle } from './bundle/types';
import { ImportWorkspaceContainer } from './ImportWorkspaceContainer';
import type { ImportBundleRepository } from './local/import-bundle-repository';
import type { ImportDraft } from './local/import-repository';

class FakeBundleRepository implements ImportBundleRepository {
  saved: ImportBundle[] = [];

  constructor(private readonly bundles: ImportBundle[] = []) {}

  async loadBundle(id: string) {
    return this.bundles.find((bundle) => bundle.id === id) ?? null;
  }

  async listBundles() {
    return [...this.bundles];
  }

  async saveBundle(bundle: ImportBundle) {
    this.saved.push(bundle);
    const index = this.bundles.findIndex((item) => item.id === bundle.id);
    if (index >= 0) this.bundles[index] = bundle;
    else this.bundles.push(bundle);
  }

  async deleteBundle() {}
}

const processedDraft: ImportDraft = {
  id: 'processor-draft',
  testId: 'processor-test',
  sourceDocuments: [
    {
      id: 'source-1',
      name: 'Reading_Test_1.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 4096,
      kind: 'PDF',
      createdAtMs: 2_000,
      sourceBytes: new TextEncoder().encode('%PDF-source').buffer,
    },
  ],
  fields: [],
  updatedAtMs: 2_000,
};

describe('ImportWorkspaceContainer', () => {
  it('creates and persists a manual Reading import bundle', async () => {
    const repository = new FakeBundleRepository();
    const user = userEvent.setup();

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={vi.fn(async () => processedDraft)}
        now={() => 1_000}
        createId={() => 'bundle-1'}
      />,
    );

    await screen.findByText('Create an import bundle');
    await user.click(screen.getByRole('radio', { name: 'Reading' }));
    await user.type(screen.getByLabelText('Test title'), 'Reading Test 1');
    await user.click(screen.getByRole('button', { name: 'Create import' }));

    await waitFor(() => expect(repository.saved).toHaveLength(1));
    expect(repository.saved[0]).toMatchObject({
      id: 'bundle-1',
      testId: 'bundle-1',
      module: 'READING',
      title: 'Reading Test 1',
      status: 'COLLECTING_SOURCES',
    });
  });

  it('adds an extracted local source to the current bundle and preserves source bytes', async () => {
    const existing: ImportBundle = {
      id: 'bundle-1',
      testId: 'test-1',
      module: 'READING',
      title: 'Reading Test 1',
      sourceDocuments: [],
      assignments: [],
      structuredDraft: null,
      status: 'COLLECTING_SOURCES',
      updatedAtMs: 1_000,
    };
    const repository = new FakeBundleRepository([existing]);
    const user = userEvent.setup();

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={vi.fn(async () => processedDraft)}
        now={() => 2_000}
        createId={() => 'unused'}
      />,
    );

    expect(await screen.findByText('Reading Test 1')).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText('Add source file'),
      new File(['pdf'], 'Reading_Test_1.pdf', { type: 'application/pdf' }),
    );

    await waitFor(() =>
      expect(repository.saved.at(-1)?.sourceDocuments).toHaveLength(1),
    );
    expect(
      new TextDecoder().decode(
        repository.saved.at(-1)?.sourceDocuments[0].sourceBytes,
      ),
    ).toBe('%PDF-source');
  });

  it('reports local persistence failure without discarding the in-memory bundle', async () => {
    const repository = new FakeBundleRepository();
    repository.saveBundle = vi.fn(async () => {
      throw new Error('IndexedDB unavailable');
    });
    const user = userEvent.setup();

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={vi.fn(async () => processedDraft)}
        now={() => 1_000}
        createId={() => 'bundle-1'}
      />,
    );

    await screen.findByText('Create an import bundle');
    await user.click(screen.getByRole('radio', { name: 'Reading' }));
    await user.type(screen.getByLabelText('Test title'), 'Reading Test 1');
    await user.click(screen.getByRole('button', { name: 'Create import' }));

    expect(
      await screen.findByRole('alert', { name: 'Import storage error' }),
    ).toHaveTextContent('IndexedDB unavailable');
    expect(screen.getByText('Reading Test 1')).toBeInTheDocument();
  });
});
