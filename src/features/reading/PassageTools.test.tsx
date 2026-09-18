import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PassageNote, PassageTextRange } from '../../exam-engine/types';
import { PassageTools } from './PassageTools';

const selection: PassageTextRange = {
  passageId: 'passage-1',
  paragraphIndex: 0,
  startOffset: 0,
  endOffset: 5,
  text: 'Urban',
};

const note: PassageNote = {
  id: 'note-1',
  passageId: 'passage-1',
  paragraphIndex: 0,
  startOffset: 0,
  endOffset: 5,
  quote: 'Urban',
  body: 'Remember this point',
  updatedAtMs: 1_000,
};

describe('PassageTools', () => {
  it('enables highlighting only when passage text is selected', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();

    const { rerender } = render(
      <PassageTools
        passageTitle="Urban green spaces"
        selection={null}
        notes={[]}
        disabled={false}
        onHighlight={onHighlight}
        onSaveNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Highlight selection' })).toBeDisabled();

    rerender(
      <PassageTools
        passageTitle="Urban green spaces"
        selection={selection}
        notes={[]}
        disabled={false}
        onHighlight={onHighlight}
        onSaveNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Highlight selection' }));
    expect(onHighlight).toHaveBeenCalledWith(selection);
  });

  it('saves a note against the current selection', async () => {
    const user = userEvent.setup();
    const onSaveNote = vi.fn();

    render(
      <PassageTools
        passageTitle="Urban green spaces"
        selection={selection}
        notes={[]}
        disabled={false}
        onHighlight={vi.fn()}
        onSaveNote={onSaveNote}
        onDeleteNote={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(screen.getByText(/Selected: “Urban”/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Note text'), 'Important definition');
    await user.click(screen.getByRole('button', { name: 'Save note' }));

    expect(onSaveNote).toHaveBeenCalledWith('Important definition', selection);
  });

  it('shows passage notes and deletes one explicitly', async () => {
    const user = userEvent.setup();
    const onDeleteNote = vi.fn();

    render(
      <PassageTools
        passageTitle="Urban green spaces"
        selection={null}
        notes={[note]}
        disabled={false}
        onHighlight={vi.fn()}
        onSaveNote={vi.fn()}
        onDeleteNote={onDeleteNote}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Notes 1' }));
    expect(screen.getByText('Remember this point')).toBeInTheDocument();
    expect(screen.getByText('“Urban”')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(onDeleteNote).toHaveBeenCalledWith('note-1');
  });
});
