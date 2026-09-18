import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportBundle } from '../bundle/domain';
import { ImportSourceManager } from './ImportSourceManager';

const handlers = {
  onCreate: vi.fn(),
  onAddFiles: vi.fn(),
  onAssign: vi.fn(),
};

function readingBundle(): ImportBundle {
  return {
    id: 'bundle-1',
    module: 'READING',
    title: 'Reading Test 1',
    sourceDocuments: [
      {
        id: 'pdf-1',
        name: 'reading.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 1024,
        kind: 'PDF',
        createdAtMs: 1,
      },
    ],
    assignments: [],
    status: 'COLLECTING_SOURCES',
    updatedAtMs: 1,
  };
}

describe('ImportSourceManager', () => {
  it('uses the first newly added source without requiring a reload', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    const empty = { ...readingBundle(), sourceDocuments: [] };
    const { rerender } = render(
      <ImportSourceManager
        bundle={empty}
        onCreate={vi.fn()}
        onAddFiles={vi.fn()}
        onAssign={onAssign}
      />,
    );

    rerender(
      <ImportSourceManager
        bundle={readingBundle()}
        onCreate={vi.fn()}
        onAddFiles={vi.fn()}
        onAssign={onAssign}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Assign pages' }));

    expect(onAssign).toHaveBeenCalledWith({
      sourceDocumentId: 'pdf-1',
      role: 'QUESTION_MATERIAL',
      pageRanges: [{ startPage: 1, endPage: 1 }],
    });
  });

  it('requires the administrator to choose Reading explicitly', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <ImportSourceManager
        bundle={null}
        onCreate={onCreate}
        onAddFiles={vi.fn()}
        onAssign={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reading' }));

    expect(onCreate).toHaveBeenCalledWith('READING', 'Untitled Reading Test');
  });

  it('accepts multiple source files for one import bundle', async () => {
    const user = userEvent.setup();
    const onAddFiles = vi.fn();

    render(
      <ImportSourceManager
        bundle={readingBundle()}
        onCreate={vi.fn()}
        onAddFiles={onAddFiles}
        onAssign={vi.fn()}
      />,
    );

    const files = [
      new File(['questions'], 'questions.pdf', { type: 'application/pdf' }),
      new File(['answers'], 'answers.pdf', { type: 'application/pdf' }),
    ];

    await user.upload(screen.getByLabelText('Add source files'), files);

    expect(onAddFiles).toHaveBeenCalledTimes(1);
    expect(onAddFiles.mock.calls[0][0]).toHaveLength(2);
  });

  it('assigns pages 1-12 as question material and page 13 as answer key', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();

    render(
      <ImportSourceManager
        bundle={readingBundle()}
        onCreate={vi.fn()}
        onAddFiles={vi.fn()}
        onAssign={onAssign}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Source role'), 'QUESTION_MATERIAL');
    await user.clear(screen.getByLabelText('Start page'));
    await user.type(screen.getByLabelText('Start page'), '1');
    await user.clear(screen.getByLabelText('End page'));
    await user.type(screen.getByLabelText('End page'), '12');
    await user.click(screen.getByRole('button', { name: 'Assign pages' }));

    expect(onAssign).toHaveBeenLastCalledWith({
      sourceDocumentId: 'pdf-1',
      role: 'QUESTION_MATERIAL',
      pageRanges: [{ startPage: 1, endPage: 12 }],
    });

    await user.selectOptions(screen.getByLabelText('Source role'), 'ANSWER_KEY');
    await user.clear(screen.getByLabelText('Start page'));
    await user.type(screen.getByLabelText('Start page'), '13');
    await user.clear(screen.getByLabelText('End page'));
    await user.type(screen.getByLabelText('End page'), '13');
    await user.click(screen.getByRole('button', { name: 'Assign pages' }));

    expect(onAssign).toHaveBeenLastCalledWith({
      sourceDocumentId: 'pdf-1',
      role: 'ANSWER_KEY',
      pageRanges: [{ startPage: 13, endPage: 13 }],
    });
  });
});
