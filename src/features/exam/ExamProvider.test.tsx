import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAttempt } from '../../exam-engine/create-attempt';
import type { ExamAttemptState } from '../../exam-engine/types';
import { ReadingExam } from '../reading/ReadingExam';
import { sampleReadingTest } from '../../test-schema/sample-reading';
import { ExamProvider } from './ExamProvider';

class RestoringAttemptRepository {
  saved: ExamAttemptState[] = [];

  constructor(private readonly restored: ExamAttemptState) {}

  async loadAttempt(id: string) {
    return id === this.restored.id ? this.restored : null;
  }

  async loadActiveAttempt(testVersionId: string) {
    return this.restored.testVersionId === testVersionId && this.restored.status === 'ACTIVE'
      ? this.restored
      : null;
  }

  async saveAttempt(attempt: ExamAttemptState) {
    this.saved.push(attempt);
  }

  async deleteAttempt() {}
}

describe('ExamProvider recovery', () => {
  it('serializes writes so a slow previous save cannot overwrite a new answer', async () => {
    const started: ExamAttemptState[] = [];
    const completed: ExamAttemptState[] = [];
    let finishFirst!: () => void;
    const repository = {
      loadAttempt: async () => null, loadActiveAttempt: async () => null, deleteAttempt: async () => {},
      saveAttempt: async (attempt: ExamAttemptState) => {
        started.push(attempt);
        if (started.length === 1) await new Promise<void>(resolve => { finishFirst = resolve; });
        completed.push(attempt);
      },
    };
    render(<ExamProvider test={sampleReadingTest} repository={repository}><ReadingExam test={sampleReadingTest} /></ExamProvider>);
    await screen.findByRole('heading', { name: 'Reading' });
    fireEvent.click(screen.getByRole('radio', { name: /British Museum/ }));
    expect(started).toHaveLength(1);
    await act(async () => { finishFirst(); });
    await waitFor(() => expect(screen.getByText('All answers saved')).toBeInTheDocument());
    expect(completed[completed.length - 1].answers.q1).toBe('A');
  });

  it('does not overwrite an existing attempt when restoring it fails', async () => {
    const saved: ExamAttemptState[] = [];
    render(<ExamProvider test={sampleReadingTest} repository={{ loadAttempt: async () => null,
      loadActiveAttempt: async () => { throw new Error('Database temporarily unavailable'); },
      saveAttempt: async attempt => { saved.push(attempt); }, deleteAttempt: async () => {} }}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to restore');
    expect(saved).toHaveLength(0);
  });
  it('restores the active local attempt before persisting a replacement', async () => {
    const restored: ExamAttemptState = {
      ...createAttempt(sampleReadingTest, 1_000),
      answers: { q1: 'A' },
      reviewQuestionIds: ['q1'],
    };
    const repository = new RestoringAttemptRepository(restored);

    render(
      <ExamProvider test={sampleReadingTest} repository={repository} nowMs={10_000}>
        <ReadingExam test={sampleReadingTest} />
      </ExamProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /British Museum/i })).toBeChecked();
    });

    expect(screen.getByTestId('question-1-status')).toHaveAttribute('data-review', 'true');
    await waitFor(() => {
      expect(repository.saved[0]?.id).toBe(restored.id);
    });
  });
});
