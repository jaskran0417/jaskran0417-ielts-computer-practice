import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../app/App';

afterEach(() => {
  vi.useRealTimers();
});

describe('Reading exam', () => {
  it('answers, flags, navigates, and returns to a question', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Reading' })).toBeInTheDocument();
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

  it('updates the visible timer while the student is idle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));

    render(<App />);
    expect(screen.getByText('60:00')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText('59:59')).toBeInTheDocument();
  });
});
