import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportBundle } from './bundle/types';
import { ImportWorkspace } from './ImportWorkspace';

function bundle(overrides: Partial<ImportBundle> = {}): ImportBundle {
  return {
    id: 'bundle-1',
    testId: 'test-1',
    module: 'READING',
    title: 'Reading Test 1',
    sourceDocuments: [],
    extractedFields: [],
    assignments: [],
    structuredDraft: null,
    status: 'COLLECTING_SOURCES',
    updatedAtMs: 1_000,
    ...overrides,
  };
}

describe('ImportWorkspace', () => {
  it('starts with manual module selection instead of guessing the module', async () => {
    const user = userEvent.setup();
    const onCreateBundle = vi.fn();

    render(
      <ImportWorkspace
        bundle={null}
        onCreateBundle={onCreateBundle}
        onAddSource={vi.fn()}
        onAssignSourceRole={vi.fn()}
        onStructure={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Reading' }));
    await user.type(screen.getByLabelText('Test title'), 'Reading Test 1');
    await user.click(screen.getByRole('button', { name: 'Create import' }));

    expect(onCreateBundle).toHaveBeenCalledWith('READING', 'Reading Test 1');
  });

  it('adds explicit question and answer page roles for one PDF', async () => {
    const user = userEvent.setup();
    const onAssignSourceRole = vi.fn();
    const pdfBundle = bundle({
      sourceDocuments: [
        {
          id: 'doc-1',
          name: 'Reading_Test_1.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 20_000,
          kind: 'PDF',
          createdAtMs: 1_000,
        },
      ],
    });

    render(
      <ImportWorkspace
        bundle={pdfBundle}
        onCreateBundle={vi.fn()}
        onAddSource={vi.fn()}
        onAssignSourceRole={onAssignSourceRole}
        onStructure={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Add role to Reading_Test_1.pdf' }),
    );
    await user.selectOptions(
      screen.getByLabelText('Role for Reading_Test_1.pdf'),
      'QUESTION_MATERIAL',
    );
    await user.type(screen.getByLabelText('Pages for selected role'), '1-12');
    await user.click(screen.getByRole('button', { name: 'Save source role' }));

    expect(onAssignSourceRole).toHaveBeenLastCalledWith({
      documentId: 'doc-1',
      role: 'QUESTION_MATERIAL',
      pageRanges: [{ startPage: 1, endPage: 12 }],
    });
  });

  it('shows saved question/answer page roles and enables structuring', () => {
    const pdfBundle = bundle({
      sourceDocuments: [
        {
          id: 'doc-1',
          name: 'Reading_Test_1.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 20_000,
          kind: 'PDF',
          createdAtMs: 1_000,
        },
      ],
      assignments: [
        {
          id: 'a1',
          documentId: 'doc-1',
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 12 }],
          requiredForPublication: true,
        },
        {
          id: 'a2',
          documentId: 'doc-1',
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 13, endPage: 13 }],
          requiredForPublication: true,
        },
      ],
    });

    render(
      <ImportWorkspace
        bundle={pdfBundle}
        onCreateBundle={vi.fn()}
        onAddSource={vi.fn()}
        onAssignSourceRole={vi.fn()}
        onStructure={vi.fn()}
      />,
    );

    expect(screen.getByText('Questions: pages 1–12')).toBeInTheDocument();
    expect(screen.getByText('Answer key: page 13')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Structure test' })).toBeEnabled();
  });

  it('shows an actionable page-range error rather than saving an invalid role', async () => {
    const user = userEvent.setup();
    const onAssignSourceRole = vi.fn();
    const pdfBundle = bundle({
      sourceDocuments: [
        {
          id: 'doc-1',
          name: 'Reading_Test_1.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 20_000,
          kind: 'PDF',
          createdAtMs: 1_000,
        },
      ],
    });

    render(
      <ImportWorkspace
        bundle={pdfBundle}
        onCreateBundle={vi.fn()}
        onAddSource={vi.fn()}
        onAssignSourceRole={onAssignSourceRole}
        onStructure={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Add role to Reading_Test_1.pdf' }),
    );
    await user.selectOptions(
      screen.getByLabelText('Role for Reading_Test_1.pdf'),
      'ANSWER_KEY',
    );
    await user.type(screen.getByLabelText('Pages for selected role'), '13-2');
    await user.click(screen.getByRole('button', { name: 'Save source role' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Page range must increase: 13-2');
    expect(onAssignSourceRole).not.toHaveBeenCalled();
  });
});
