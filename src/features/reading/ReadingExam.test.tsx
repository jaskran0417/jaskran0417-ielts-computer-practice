import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../app/App';
import type { ExamAttemptState } from '../../exam-engine/types';
import type { AttemptRepository } from '../../storage/attempt-repository';

class EmptyAttemptRepository implements AttemptRepository {
  async loadAttempt() {
    return null;
  }

  async loadActiveAttempt() {
    return null;
  }

  async saveAttempt(_attempt: ExamAttemptState) {}

  async deleteAttempt() {}
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Reading exam', () => {
  it('answers, flags, navigates, and returns to a question', async () => {
    const user = userEvent.setup();
    render(<App repository={new EmptyAttemptRepository()} />);

    expect(await screen.findByRole('heading', { name: 'Reading' })).toBeInTheDocument();
    expect(screen.getByText(/Urban green spaces/i)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /British Museum/i }));
    expect(screen.getByTestId('question-1-status')).toHaveAttribute('data-state', 'answered');

    await user.click(screen.getByRole('button', { name: 'Mark question 1 for review' }));
    expect(screen.getByTestId('question-1-status')).toHaveAttribute('data-review', 'true');

    await user.click(screen.getByRole('button', { name: 'Question 2' }));
    expect(screen.getByText('Question 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Question 1' }));
    expect(screen.getByRole('radio', { name: /British Museum/i })).toBeChecked();
  });

  it('updates the visible timer while the student is idle', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    const nowMs = Date.now();

    render(<App repository={new EmptyAttemptRepository()} nowMs={nowMs} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('60:00')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText('59:59')).toBeInTheDocument();
  });

  it('automatically locks the exam when time expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    const nowMs = Date.now();

    render(<App repository={new EmptyAttemptRepository()} nowMs={nowMs} />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark question 1 for review' })).toBeDisabled();
  });
});
