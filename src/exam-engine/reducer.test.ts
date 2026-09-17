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
