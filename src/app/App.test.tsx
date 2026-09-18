import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ExamAttemptState } from '../exam-engine/types';
import type { AttemptRepository } from '../storage/attempt-repository';
import App from './App';

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

describe('App session flow', () => {
  it('starts in the modern session setup workspace', () => {
    render(<App repository={new EmptyAttemptRepository()} nowMs={1_000} />);

    expect(screen.getByRole('heading', { name: 'Create a test session' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByText('Exam Studio')).toBeInTheDocument();
  });

  it('opens the importer as a real workspace section', async () => {
    const user = userEvent.setup();
    render(<App repository={new EmptyAttemptRepository()} nowMs={1_000} />);

    await user.click(screen.getByRole('button', { name: /Import/i }));

    expect(await screen.findByRole('heading', { name: 'Import test material' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Sessions/i })).not.toHaveAttribute('aria-current');
  });

  it('uses the real local importer by default without Supabase configuration', async () => {
    const user = userEvent.setup();
    render(<App repository={new EmptyAttemptRepository()} nowMs={1_000} />);

    await user.click(screen.getByRole('button', { name: /Import/i }));
    await user.click(await screen.findByRole('button', { name: 'Reading' }));
    await user.upload(
      screen.getByLabelText('Add source files'),
      new File(['1 library\n2 B\n3 TRUE'], 'answers.txt', { type: 'text/plain' }),
    );

    expect(await screen.findByRole('option', { name: 'answers.txt' })).toBeInTheDocument();
    expect(screen.getAllByText('VERIFIED')).toHaveLength(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('launches Reading-only into the focused existing exam player', async () => {
    const user = userEvent.setup();
    render(<App repository={new EmptyAttemptRepository()} nowMs={1_000} />);

    await user.click(screen.getByRole('checkbox', { name: 'Reading' }));
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(await screen.findByRole('heading', { name: 'Reading' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
    expect(screen.queryByText('Exam Studio')).not.toBeInTheDocument();
  });

  it('does not fake an exam when a selected module player is not attached yet', async () => {
    const user = userEvent.setup();
    render(<App repository={new EmptyAttemptRepository()} nowMs={2_000} />);

    await user.click(screen.getByRole('checkbox', { name: 'Listening' }));
    await user.click(screen.getByRole('checkbox', { name: 'Reading' }));
    await user.click(screen.getByRole('radio', { name: 'Mock test' }));
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(screen.getByRole('heading', { name: 'Session configured' })).toBeInTheDocument();
    expect(screen.getByText(/Listening player is not attached yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reading' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  });
});
