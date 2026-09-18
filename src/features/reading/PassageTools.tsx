import { useMemo, useState } from 'react';
import type { PassageNote, PassageTextRange } from '../../exam-engine/types';

interface PassageToolsProps {
  passageTitle: string;
  selection: PassageTextRange | null;
  notes: PassageNote[];
  disabled: boolean;
  onHighlight(selection: PassageTextRange): void;
  onSaveNote(body: string, selection: PassageTextRange | null): void;
  onDeleteNote(noteId: string): void;
}

export function PassageTools({
  passageTitle,
  selection,
  notes,
  disabled,
  onHighlight,
  onSaveNote,
  onDeleteNote,
}: PassageToolsProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [body, setBody] = useState('');

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAtMs - a.updatedAtMs),
    [notes],
  );

  function saveNote() {
    const trimmed = body.trim();
    if (!trimmed || disabled) return;
    onSaveNote(trimmed, selection);
    setBody('');
    setComposerOpen(false);
    setNotesOpen(true);
  }

  return (
    <div className="passage-tools" aria-label={'Tools for ' + passageTitle}>
      <div className="passage-tool-actions">
        <button
          type="button"
          className="passage-tool-button"
          disabled={disabled || !selection}
          onClick={() => selection && onHighlight(selection)}
        >
          Highlight selection
        </button>
        <button
          type="button"
          className="passage-tool-button"
          disabled={disabled}
          onClick={() => setComposerOpen((open) => !open)}
        >
          Add note
        </button>
        <button
          type="button"
          className="passage-tool-button"
          aria-expanded={notesOpen}
          onClick={() => setNotesOpen((open) => !open)}
        >
          Notes {notes.length}
        </button>
      </div>

      {selection ? (
        <p className="passage-selection-preview">
          Selected: “{selection.text}”
        </p>
      ) : null}

      {composerOpen ? (
        <div className="passage-note-composer">
          <p>
            {selection
              ? 'Note for “' + selection.text + '”'
              : 'Note for ' + passageTitle}
          </p>
          <label>
            <span>Note text</span>
            <textarea
              value={body}
              rows={3}
              disabled={disabled}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </label>
          <div className="passage-note-actions">
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setComposerOpen(false);
                setBody('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-action"
              disabled={disabled || !body.trim()}
              onClick={saveNote}
            >
              Save note
            </button>
          </div>
        </div>
      ) : null}

      {notesOpen ? (
        <div className="passage-notes-panel" aria-label="Passage notes">
          {sortedNotes.length === 0 ? (
            <p className="passage-notes-empty">No notes for this passage yet.</p>
          ) : (
            <ul>
              {sortedNotes.map((note) => (
                <li key={note.id}>
                  {note.quote ? <blockquote>“{note.quote}”</blockquote> : null}
                  <p>{note.body}</p>
                  <button
                    type="button"
                    className="passage-note-delete"
                    disabled={disabled}
                    onClick={() => onDeleteNote(note.id)}
                  >
                    Delete note
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
