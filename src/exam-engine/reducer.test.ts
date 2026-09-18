import { describe, expect, it } from 'vitest';
import { sampleReadingTest } from '../test-schema/sample-reading';
import { createAttempt } from './create-attempt';
import { examReducer } from './reducer';

describe('examReducer', () => {
  it('records an answer without mutating previous state', () => {
    const initial = createAttempt(sampleReadingTest, 1_000);
    const next = examReducer(initial, {
      type: 'ANSWER_CHANGED',
      questionId: 'q1',
      value: 'A',
    });

    expect(next.answers.q1).toBe('A');
    expect(initial.answers.q1).toBeUndefined();
  });

  it('toggles review state for a question', () => {
    const initial = createAttempt(sampleReadingTest, 1_000);
    const flagged = examReducer(initial, { type: 'TOGGLE_REVIEW', questionId: 'q2' });
    const unflagged = examReducer(flagged, { type: 'TOGGLE_REVIEW', questionId: 'q2' });

    expect(flagged.reviewQuestionIds).toContain('q2');
    expect(unflagged.reviewQuestionIds).not.toContain('q2');
  });

  it('navigates directly to another question', () => {
    const initial = createAttempt(sampleReadingTest, 1_000);
    const next = examReducer(initial, { type: 'NAVIGATE', questionId: 'q3' });
    expect(next.currentQuestionId).toBe('q3');
    expect(next.visitedQuestionIds).toContain('q3');
  });

  it('adds and removes a passage highlight without mutating previous state', () => {
    const initial = createAttempt(sampleReadingTest, 1_000);
    const highlight = {
      id: 'highlight-1',
      passageId: 'passage-1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 5,
      text: 'Urban',
    };

    const added = examReducer(initial, { type: 'ADD_HIGHLIGHT', highlight });
    const removed = examReducer(added, {
      type: 'REMOVE_HIGHLIGHT',
      highlightId: highlight.id,
    });

    expect(initial.highlights).toEqual([]);
    expect(added.highlights).toEqual([highlight]);
    expect(removed.highlights).toEqual([]);
  });

  it('upserts and deletes a passage note', () => {
    const initial = createAttempt(sampleReadingTest, 1_000);
    const note = {
      id: 'note-1',
      passageId: 'passage-1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 5,
      quote: 'Urban',
      body: 'Important definition',
      updatedAtMs: 2_000,
    };

    const added = examReducer(initial, { type: 'UPSERT_NOTE', note });
    const edited = examReducer(added, {
      type: 'UPSERT_NOTE',
      note: { ...note, body: 'Updated note', updatedAtMs: 3_000 },
    });
    const removed = examReducer(edited, {
      type: 'DELETE_NOTE',
      noteId: note.id,
    });

    expect(initial.notes).toEqual([]);
    expect(added.notes[0]?.body).toBe('Important definition');
    expect(edited.notes).toHaveLength(1);
    expect(edited.notes[0]?.body).toBe('Updated note');
    expect(removed.notes).toEqual([]);
  });

  it('rejects answer changes after submission', () => {
    const initial = createAttempt(sampleReadingTest, 1_000);
    const submitted = examReducer(initial, { type: 'SUBMIT', submittedAtMs: 5_000 });
    const changed = examReducer(submitted, {
      type: 'ANSWER_CHANGED',
      questionId: 'q1',
      value: 'B',
    });

    expect(changed).toBe(submitted);
    expect(changed.answers.q1).toBeUndefined();
  });
});
