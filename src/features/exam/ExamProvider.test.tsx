import { render, screen, waitFor } from '@testing-library/react';
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
    expect(repository.saved[0]?.id).toBe(restored.id);
  });
});
