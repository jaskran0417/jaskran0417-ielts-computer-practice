import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StudentQuestion } from '../test-schema/types';
import { QuestionRenderer } from './QuestionRenderer';

function renderQuestion(
  question: StudentQuestion,
  onChange = vi.fn(),
  value?: string | string[],
) {
  render(
    <QuestionRenderer
      question={question}
      value={value}
      onChange={onChange}
      disabled={false}
      assetUrlById={{ diagram: '/diagram.png', table: '/table.png' }}
    />,
  );
  return onChange;
}

describe('QuestionRenderer', () => {
  it('renders True/False/Not Given as exclusive choices', async () => {
    const onChange = renderQuestion({
      id: 'q-10',
      number: 10,
      type: 'TRUE_FALSE_NOT_GIVEN',
      prompt: 'The statement agrees with the passage.',
    });

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await userEvent.click(screen.getByRole('radio', { name: 'False' }));
    expect(onChange).toHaveBeenLastCalledWith('FALSE');
  });

  it('renders Yes/No/Not Given as exclusive choices', async () => {
    const onChange = renderQuestion({
      id: 'q-11',
      number: 11,
      type: 'YES_NO_NOT_GIVEN',
      prompt: 'The writer agrees with the statement.',
    });

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await userEvent.click(screen.getByRole('radio', { name: 'No' }));
    expect(onChange).toHaveBeenLastCalledWith('NO');
  });

  it('renders multiple-select choices and returns the selected ids', async () => {
    const onChange = renderQuestion({
      id: 'q-12',
      number: 12,
      type: 'MULTI_SELECT',
      prompt: 'Choose two answers.',
      options: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
        { id: 'C', label: 'Gamma' },
      ],
      minSelections: 2,
      maxSelections: 2,
    });

    await userEvent.click(screen.getByRole('checkbox', { name: /Alpha/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Beta/ }));
    expect(onChange).toHaveBeenLastCalledWith(['A', 'B']);
  });

  it('renders matching options as a select control', async () => {
    const onChange = renderQuestion({
      id: 'q-20',
      number: 20,
      type: 'MATCHING_HEADINGS',
      prompt: 'Section B',
      options: [
        { id: 'i', label: 'Beach garbage from far away' },
        { id: 'ii', label: 'Fish consumption' },
      ],
      allowOptionReuse: false,
    });

    await userEvent.selectOptions(screen.getByRole('combobox'), 'ii');
    expect(onChange).toHaveBeenLastCalledWith('ii');
  });

  it('renders short-answer and completion questions as text input', () => {
    const onChange = renderQuestion({
      id: 'q-15',
      number: 15,
      type: 'SHORT_ANSWER',
      prompt: 'What environmental problem was caused?',
      instructionConstraints: { maxWords: 2, numbersAllowed: true },
    });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'water pollution' } });
    expect(onChange).toHaveBeenLastCalledWith('water pollution');
  });

  it('renders diagram labels against the resolved retained visual asset', () => {
    renderQuestion({
      id: 'q-1',
      number: 1,
      type: 'DIAGRAM_LABEL_COMPLETION',
      prompt: 'Label 1',
      assetId: 'diagram',
      anchor: { x: 0.2, y: 0.3, width: 0.15, height: 0.08 },
    });

    expect(screen.getByRole('img', { name: 'Question 1 diagram' })).toHaveAttribute(
      'src',
      '/diagram.png',
    );
    expect(screen.getByRole('textbox', { name: 'Question 1 answer' })).toBeInTheDocument();
  });

  it('disables answer controls after the exam is no longer active', () => {
    render(
      <QuestionRenderer
        question={{
          id: 'q-15',
          number: 15,
          type: 'SHORT_ANSWER',
          prompt: 'Answer',
        }}
        value=""
        onChange={vi.fn()}
        disabled
        assetUrlById={{}}
      />,
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders table completion against the resolved table visual asset', () => {
    renderQuestion({
      id: 'q-28',
      number: 28,
      type: 'TABLE_COMPLETION',
      prompt: 'Complete the table',
      tableId: 'passage-3-table',
      cellId: 'cell-q28',
      assetId: 'table',
      anchor: { x: 0.1, y: 0.2, width: 0.2, height: 0.08 },
    });

    expect(screen.getByRole('img', { name: 'Question 28 table' })).toHaveAttribute(
      'src',
      '/table.png',
    );
    expect(screen.getByRole('textbox', { name: 'Question 28 answer' })).toBeInTheDocument();
  });
});
