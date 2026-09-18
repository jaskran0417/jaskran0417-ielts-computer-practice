import { describe, expect, it } from 'vitest';
import { sampleReadingTest } from '../test-schema/sample-reading';
import type { StudentTestPackage } from '../test-schema/types';
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


  it('tracks Listening playback progress and part changes', () => {
    const listeningTest: StudentTestPackage = {
      id: 'listening-test',
      versionId: 'listening-v1',
      title: 'Listening practice',
      durationSeconds: 40 * 60,
      modules: [{
        id: 'listening',
        kind: 'LISTENING',
        title: 'Listening',
        finalReviewSeconds: 120,
        sections: [{
          id: 'part-1',
          title: 'Part 1',
          partNumber: 1,
          audioAssetId: 'audio-1',
          questionGroups: [{
            id: 'group-1',
            instruction: 'Answer the question.',
            questions: [{
              id: 'lq1',
              number: 1,
              type: 'GAP_FILL',
              prompt: 'Question one',
            }],
          }],
        }, {
          id: 'part-2',
          title: 'Part 2',
          partNumber: 2,
          audioAssetId: 'audio-2',
          questionGroups: [{
            id: 'group-2',
            instruction: 'Answer the question.',
            questions: [{
              id: 'lq2',
              number: 2,
              type: 'GAP_FILL',
              prompt: 'Question two',
            }],
          }],
        }],
      }],
    };

    const initial = createAttempt(listeningTest, 1_000);
    expect(initial.listeningPlayback).toEqual({
      partIndex: 0,
      audioPositionSeconds: 0,
      started: false,
      ended: false,
      pauses: [],
    });

    const started = examReducer(initial, {
      type: 'LISTENING_STARTED',
      partIndex: 0,
      audioPositionSeconds: 0,
    });
    const progressed = examReducer(started, {
      type: 'LISTENING_PROGRESS',
      partIndex: 0,
      audioPositionSeconds: 18.4,
    });
    const changed = examReducer(progressed, {
      type: 'LISTENING_PART_CHANGED',
      partIndex: 1,
      audioPositionSeconds: 0,
    });

    expect(started.listeningPlayback?.started).toBe(true);
    expect(progressed.listeningPlayback?.audioPositionSeconds).toBe(18.4);
    expect(changed.listeningPlayback).toMatchObject({
      partIndex: 1,
      audioPositionSeconds: 0,
      ended: false,
    });
  });

  it('records and closes deliberate Practice Listening pauses', () => {
    const initial = {
      ...createAttempt(sampleReadingTest, 1_000),
      listeningPlayback: {
        partIndex: 0,
        audioPositionSeconds: 42,
        started: true,
        ended: false,
        pauses: [],
      },
    };

    const paused = examReducer(initial, {
      type: 'LISTENING_PRACTICE_PAUSE_STARTED',
      pause: {
        id: 'pause-1',
        startedAtMs: 2_000,
        audioPositionSeconds: 42,
      },
    });
    const resumed = examReducer(paused, {
      type: 'LISTENING_PRACTICE_PAUSE_ENDED',
      pauseId: 'pause-1',
      endedAtMs: 5_000,
      audioPositionSeconds: 42,
    });

    expect(paused.listeningPlayback?.pauses).toEqual([{
      id: 'pause-1',
      startedAtMs: 2_000,
      audioPositionSeconds: 42,
    }]);
    expect(resumed.listeningPlayback?.pauses[0]?.endedAtMs).toBe(5_000);
  });

  it('persists Listening final review and ended state', () => {
    const initial = {
      ...createAttempt(sampleReadingTest, 1_000),
      listeningPlayback: {
        partIndex: 3,
        audioPositionSeconds: 600,
        started: true,
        ended: false,
        pauses: [],
      },
    };

    const reviewing = examReducer(initial, {
      type: 'LISTENING_FINAL_REVIEW_STARTED',
      startedAtMs: 10_000,
    });
    const ended = examReducer(reviewing, { type: 'LISTENING_ENDED' });

    expect(reviewing.listeningPlayback?.finalReviewStartedAtMs).toBe(10_000);
    expect(ended.listeningPlayback?.ended).toBe(true);
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
