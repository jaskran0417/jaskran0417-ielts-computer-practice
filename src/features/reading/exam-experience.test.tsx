import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sampleReadingTest } from '../../test-schema/sample-reading';
import type { QuestionGroup } from '../../test-schema/types';
import { ExamProvider } from '../exam/ExamProvider';
import { ReadingExam } from './ReadingExam';
import { ReadingQuestionGroup } from './ReadingQuestionGroup';

function Group({ group }: { group: QuestionGroup }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  return <ReadingQuestionGroup group={group} activeQuestionId={group.questions[0].id}
    answers={answers} reviewQuestionIds={[]} disabled={false} assetUrlById={{ image: '/diagram.png' }}
    onNavigate={() => {}} onToggleReview={() => {}}
    onAnswer={(id, value) => setAnswers(previous => ({ ...previous, [id]: value }))} />;
}

const matching: QuestionGroup = {
  id: 'match', instruction: 'Match the headings.',
  questions: [1, 2].map(number => ({ id: `q${number}`, number, type: 'MATCHING_HEADINGS',
    prompt: `Section ${number}`, allowOptionReuse: false,
    options: [{ id: 'i', label: 'Changing cities' }, { id: 'ii', label: 'Urban wildlife' }],
  })),
};

describe('computer Reading experience', () => {
  it('shows every group in a part and supports next-question navigation', async () => {
    const repository = { loadActiveAttempt: async () => null, loadAttempt: async () => null,
      saveAttempt: async () => {}, deleteAttempt: async () => {} };
    render(<ExamProvider test={sampleReadingTest} repository={repository}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>);
    expect(await screen.findByTestId('question-panel-1')).toBeInTheDocument();
    expect(screen.getByTestId('question-panel-3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByTestId('question-2-status')).toHaveAttribute('aria-current', 'step');
  });

  it('puts an answer inside an explicit completion gap', () => {
    render(<Group group={{ id: 'sentence', instruction: 'ONE WORD ONLY', questions: [{
      id: 'q1', number: 1, type: 'SENTENCE_COMPLETION', prompt: 'Trees provide ____ in summer.',
    }] }} />);
    const input = screen.getByRole('textbox', { name: 'Question 1 answer' });
    expect(input.closest('.inline-completion')).toHaveTextContent('Trees provide in summer.');
    fireEvent.change(input, { target: { value: 'shade' } });
    expect(input).toHaveValue('shade');
  });

  it('assigns a bank option by keyboard/click and prevents unallowed reuse', async () => {
    render(<Group group={matching} />);
    await userEvent.click(screen.getByRole('button', { name: 'i. Changing cities' }));
    await userEvent.click(screen.getByRole('button', { name: 'Question 1 matching answer' }));
    expect(screen.getByRole('button', { name: 'Question 1 matching answer' })).toHaveTextContent('Changing cities');
    expect(screen.getByRole('button', { name: 'i. Changing cities' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Clear question 1 answer' }));
    expect(screen.getByRole('button', { name: 'i. Changing cities' })).toBeEnabled();
  });

  it('allows reusing options when the task permits it', async () => {
    render(<Group group={{ ...matching, questions: matching.questions.map(q => ({ ...q, allowOptionReuse: true })) }} />);
    for (const number of [1, 2]) {
      await userEvent.click(screen.getByRole('button', { name: 'i. Changing cities' }));
      await userEvent.click(screen.getByRole('button', { name: `Question ${number} matching answer` }));
    }
    expect(screen.getByRole('button', { name: 'Question 2 matching answer' })).toHaveTextContent('Changing cities');
  });

  it('accepts a drag from the same bank and ignores unrelated dropped text', () => {
    render(<Group group={matching} />);
    const target = screen.getByRole('button', { name: 'Question 1 matching answer' });
    fireEvent.drop(target, { dataTransfer: { getData: () => JSON.stringify({ groupId: 'other', optionId: 'i' }) } });
    expect(target).toHaveTextContent('Choose or drop');
    fireEvent.drop(target, { dataTransfer: { getData: () => JSON.stringify({ groupId: 'match', optionId: 'ii' }) } });
    expect(target).toHaveTextContent('Urban wildlife');
  });

  it('provides the full source as context without losing a visual answer', async () => {
    render(<Group group={{ id: 'visual', instruction: 'Label the diagram', questions: [{
      id: 'q1', number: 1, type: 'DIAGRAM_LABEL_COMPLETION', prompt: 'Label', assetId: 'image',
      anchor: { x: 0.5, y: 0.4, width: 0.2, height: 0.08 },
    }] }} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Question 1 answer' }), { target: { value: 'corona' } });
    await userEvent.click(screen.getByRole('button', { name: 'Show full image' }));
    expect(screen.getByRole('img')).toHaveStyle({ width: '100%' });
    expect(screen.getByRole('textbox', { name: 'Question 1 answer' })).toHaveValue('corona');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('reports failed saves and retries instead of silently saying saved', async () => {
    const saveAttempt = vi.fn().mockRejectedValueOnce(new Error('Quota exceeded')).mockResolvedValue(undefined);
    render(<ExamProvider test={sampleReadingTest} repository={{ loadActiveAttempt: async () => null,
      loadAttempt: async () => null, saveAttempt, deleteAttempt: async () => {} }}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Answers are not saved');
    await userEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    await waitFor(() => expect(screen.getByText('All answers saved')).toBeInTheDocument());
  });
});
