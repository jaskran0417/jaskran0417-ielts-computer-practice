import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportBundle } from './bundle/domain';
import type {
  ImportDraft,
  ImportRepository,
} from './local/import-repository';
import { ImportWorkspaceContainer } from './ImportWorkspaceContainer';

const restoredDraft: ImportDraft = {
  id: 'draft-restored',
  testId: 'test-restored',
  sourceDocuments: [
    {
      id: 'source-restored',
      name: 'restored-reading.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 2048,
      kind: 'PDF',
      createdAtMs: 1_000,
    },
  ],
  fields: [
    {
      id: 'question-restored',
      kind: 'QUESTION_TEXT',
      critical: true,
      verification: {
        state: 'REVIEW_REQUIRED',
        normalizedValue: null,
        reasons: ['Independent extraction passes disagree'],
        passA: {
          value: 'The library closes at six.',
          confidence: null,
          evidence: {
            documentId: 'source-restored',
            pageNumber: 2,
            method: 'PDF_TEXT',
          },
        },
        passB: {
          value: 'The library closes at eight.',
          confidence: 85,
          evidence: {
            documentId: 'source-restored',
            pageNumber: 2,
            method: 'OCR_B',
          },
        },
      },
    },
  ],
  updatedAtMs: 2_000,
};

class FakeImportRepository implements ImportRepository {
  saved: ImportDraft[] = [];
  bundles: ImportBundle[] = [];

  constructor(private readonly drafts: ImportDraft[]) {}

  async loadDraft(id: string) {
    return this.drafts.find((draft) => draft.id === id) ?? null;
  }

  async saveDraft(draft: ImportDraft) {
    this.saved.push(draft);
  }

  async deleteDraft() {}

  async listDrafts() {
    return [...this.drafts];
  }

  async loadBundle(id: string) {
    return this.bundles.find((bundle) => bundle.id === id) ?? null;
  }

  async saveBundle(bundle: ImportBundle) {
    this.bundles = [...this.bundles.filter((item) => item.id !== bundle.id), bundle];
  }

  async deleteBundle(id: string) {
    this.bundles = this.bundles.filter((bundle) => bundle.id !== id);
  }

  async listBundles() {
    return [...this.bundles];
  }
}

describe('ImportWorkspaceContainer', () => {
  it('creates and persists a manually selected Reading import bundle', async () => {
    const repository = new FakeImportRepository([]);
    const user = userEvent.setup();

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={vi.fn()}
      />,
    );

    await screen.findByText('No source loaded');
    await user.click(screen.getByRole('button', { name: 'Reading' }));

    await waitFor(() => expect(repository.bundles).toHaveLength(1));
    expect(repository.bundles[0]).toMatchObject({
      module: 'READING',
      title: 'Untitled Reading Test',
      sourceDocuments: [],
      assignments: [],
      status: 'COLLECTING_SOURCES',
    });
    expect(screen.getByText('Untitled Reading Test')).toBeInTheDocument();
  });

  it('adds processed local files to the current import bundle', async () => {
    const repository = new FakeImportRepository([]);
    const user = userEvent.setup();
    const processFile = vi.fn(async () => restoredDraft);

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={processFile}
      />,
    );

    await screen.findByText('No source loaded');
    await user.click(screen.getByRole('button', { name: 'Reading' }));
    await user.upload(
      screen.getByLabelText('Add source files'),
      new File(['pdf'], 'restored-reading.pdf', { type: 'application/pdf' }),
    );

    await waitFor(() =>
      expect(repository.bundles.at(-1)?.sourceDocuments[0]?.name).toBe(
        'restored-reading.pdf',
      ),
    );
    expect(await screen.findByText('restored-reading.pdf')).toBeInTheDocument();
  });

  it('restores the newest local draft and saves explicit review changes', async () => {
    const repository = new FakeImportRepository([restoredDraft]);
    const processFile = vi.fn();

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={processFile}
      />,
    );

    expect(screen.getByText('Loading local import draft…')).toBeInTheDocument();
    expect(await screen.findByText('restored-reading.pdf')).toBeInTheDocument();

    const confirmedValue = screen.getByRole('textbox', { name: 'Confirmed value' });
    const user = userEvent.setup();
    await user.clear(confirmedValue);
    await user.type(confirmedValue, 'The library closes at six.');
    await user.click(screen.getByRole('button', { name: 'Confirm value' }));

    await waitFor(() => expect(repository.saved).toHaveLength(1));
    expect(repository.saved[0].fields[0]).toMatchObject({
      confirmedValue: 'The library closes at six.',
      verification: { state: 'CONFIRMED' },
    });
    expect(screen.getByText('Saved locally')).toBeInTheDocument();
  });

  it('shows local persistence failures instead of silently losing the draft', async () => {
    const repository = new FakeImportRepository([]);
    repository.saveDraft = vi.fn(async () => {
      throw new Error('IndexedDB unavailable');
    });

    const processFile = vi.fn(async () => restoredDraft);

    render(
      <ImportWorkspaceContainer
        repository={repository}
        processFile={processFile}
      />,
    );

    await screen.findByText('No source loaded');
    const user = userEvent.setup();
    await user.upload(
      screen.getByLabelText('Choose source file'),
      new File(['pdf'], 'restored-reading.pdf', { type: 'application/pdf' }),
    );

    expect(await screen.findByText('restored-reading.pdf')).toBeInTheDocument();
    expect(
      await screen.findByRole('alert', { name: 'Import storage error' }),
    ).toHaveTextContent('IndexedDB unavailable');
  });
});
