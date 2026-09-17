import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../app/App';

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
});
