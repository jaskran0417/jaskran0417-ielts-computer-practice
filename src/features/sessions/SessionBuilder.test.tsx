import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionBuilder } from './SessionBuilder';

describe('SessionBuilder', () => {
  it('blocks creation until at least one module is selected', () => {
    render(
      <SessionBuilder
        testId="test-1"
        testVersionId="version-1"
        nowMs={1_000}
        onCreate={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create session' })).toBeDisabled();
  });

  it('creates a Reading Practice session', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <SessionBuilder
        testId="test-1"
        testVersionId="version-1"
        nowMs={1_000}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Reading/i }));
    const createButton = screen.getByRole('button', { name: 'Create session' });
    expect(createButton).toBeEnabled();
    await user.click(createButton);

    expect(onCreate).toHaveBeenCalledWith({
      id: 'session-1000',
      testId: 'test-1',
      testVersionId: 'version-1',
      modules: ['READING'],
      mode: 'PRACTICE',
      createdAtMs: 1_000,
    });
  });

  it('requires Writing delivery only while Writing is selected', async () => {
    const user = userEvent.setup();
    render(
      <SessionBuilder
        testId="test-1"
        testVersionId="version-1"
        nowMs={1_000}
        onCreate={() => {}}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Writing/i }));
    expect(screen.getByRole('radio', { name: 'Computer' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Paper' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create session' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Paper' }));
    expect(screen.getByRole('button', { name: 'Create session' })).toBeEnabled();

    await user.click(screen.getByRole('checkbox', { name: /Writing/i }));
    expect(screen.queryByRole('radio', { name: 'Paper' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create session' })).toBeDisabled();
  });

  it('creates an exact Listening + Reading Mock configuration', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <SessionBuilder
        testId="test-1"
        testVersionId="version-1"
        nowMs={2_000}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Listening/i }));
    await user.click(screen.getByRole('checkbox', { name: /Reading/i }));
    await user.click(screen.getByRole('radio', { name: /Mock test/i }));
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(onCreate).toHaveBeenCalledWith({
      id: 'session-2000',
      testId: 'test-1',
      testVersionId: 'version-1',
      modules: ['LISTENING', 'READING'],
      mode: 'MOCK',
      createdAtMs: 2_000,
    });
  });
});
