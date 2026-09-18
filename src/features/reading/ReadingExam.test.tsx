import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExamAttemptState } from '../../exam-engine/types';
import type { AttemptRepository } from '../../storage/attempt-repository';
import { sampleReadingTest } from '../../test-schema/sample-reading';
import { ExamProvider } from '../exam/ExamProvider';
import { ReadingExam } from './ReadingExam';

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

class SavedAttemptRepository extends EmptyAttemptRepository {
  constructor(private readonly saved: ExamAttemptState) {
    super();
  }

  async loadActiveAttempt() {
    return this.saved;
  }
}

function renderReading(repository: AttemptRepository, nowMs?: number) {
  return render(
    <ExamProvider test={sampleReadingTest} repository={repository} nowMs={nowMs}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Reading exam', () => {
  it('answers, flags, navigates, and returns to a question', async () => {
    const user = userEvent.setup();
    renderReading(new EmptyAttemptRepository());

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

  it('turns a passage text selection into a removable highlight', async () => {
    const user = userEvent.setup();
    renderReading(new EmptyAttemptRepository());

    const passageText = await screen.findByText(/Cities around the world/i);
    const paragraph = passageText.closest('p');
    expect(paragraph).not.toBeNull();

    const textNode = passageText.firstChild;
    expect(textNode).not.toBeNull();

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode!, 0);
    range.setEnd(textNode!, 6);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(paragraph!);

    const highlightButton = screen.getByRole('button', {
      name: 'Highlight selection',
    });
    expect(highlightButton).toBeEnabled();
    await user.click(highlightButton);

    const highlighted = paragraph!.querySelector('.passage-highlight');
    expect(highlighted).not.toBeNull();
    expect(highlighted).toHaveTextContent('Cities');

    await user.click(highlighted as HTMLElement);
    expect(paragraph!.querySelector('.passage-highlight')).toBeNull();
  });

  it('restores saved highlights and notes into the Reading UI', async () => {
    const attempt = {
      ...createAttempt(sampleReadingTest, 1_000),
      highlights: [{
        id: 'highlight-1',
        passageId: 'passage-1',
        paragraphIndex: 0,
        startOffset: 0,
        endOffset: 6,
        text: 'Cities',
      }],
      notes: [{
        id: 'note-1',
        passageId: 'passage-1',
        paragraphIndex: 0,
        startOffset: 0,
        endOffset: 6,
        quote: 'Cities',
        body: 'Opening concept',
        updatedAtMs: 2_000,
      }],
    };

    const user = userEvent.setup();
    renderReading(new SavedAttemptRepository(attempt));

    const highlighted = await screen.findByText('Cities');
    expect(highlighted).toHaveClass('passage-highlight');

    await user.click(screen.getByRole('button', { name: 'Notes 1' }));
    expect(screen.getByText('Opening concept')).toBeInTheDocument();
    expect(screen.getByText('“Cities”')).toBeInTheDocument();
  });

  it('updates the visible timer while the student is idle', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    const nowMs = Date.now();

    renderReading(new EmptyAttemptRepository(), nowMs);

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

    renderReading(new EmptyAttemptRepository(), nowMs);

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
