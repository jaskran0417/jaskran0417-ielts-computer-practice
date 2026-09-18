import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QuestionGroup } from '../../test-schema/types';
import { ReadingQuestionGroup } from './ReadingQuestionGroup';

function renderGroup(group: QuestionGroup) {
  const onNavigate = vi.fn();
  const onAnswer = vi.fn();
  const onToggleReview = vi.fn();

  render(
    <ReadingQuestionGroup
      group={group}
      activeQuestionId={group.questions[0]!.id}
      answers={{}}
      reviewQuestionIds={[]}
      disabled={false}
      assetUrlById={{ diagram: '/diagram.png' }}
      onNavigate={onNavigate}
      onAnswer={onAnswer}
      onToggleReview={onToggleReview}
    />,
  );

  return { onNavigate, onAnswer, onToggleReview };
}

describe('ReadingQuestionGroup', () => {
  it('renders a diagram group once with all answer boxes over the shared visual', () => {
    const group: QuestionGroup = {
      id: 'diagram-group',
      instruction: 'Label the diagram.',
      questions: [1, 2, 3, 4].map((number) => ({
        id: `q-${number}`,
        number,
        type: 'DIAGRAM_LABEL_COMPLETION' as const,
        prompt: `Label ${number}`,
        assetId: 'diagram',
        anchor: {
          x: 0.64,
          y: 0.28 + number * 0.1,
          width: 0.18,
          height: 0.06,
        },
      })),
    };

    const { onAnswer } = renderGroup(group);

    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
    expect(screen.getByTestId('visual-question-group')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Question 2 answer' }), {
      target: { value: 'radiative zone' },
    });
    expect(onAnswer).toHaveBeenCalledWith('q-2', 'radiative zone');
  });

  it('shows every question in the active non-visual group instead of one isolated card', () => {
    const group: QuestionGroup = {
      id: 'matching-group',
      instruction: 'Complete each sentence with the correct ending A-C.',
      questions: [5, 6, 7].map((number) => ({
        id: `q-${number}`,
        number,
        type: 'MATCHING_SENTENCE_ENDINGS' as const,
        prompt: `Stem ${number}`,
        options: [
          { id: 'A', label: 'Ending alpha' },
          { id: 'B', label: 'Ending bravo' },
          { id: 'C', label: 'Ending charlie' },
        ],
        allowOptionReuse: false,
      })),
    };

    renderGroup(group);

    expect(screen.getByTestId('question-panel-5')).toBeInTheDocument();
    expect(screen.getByTestId('question-panel-6')).toBeInTheDocument();
    expect(screen.getByTestId('question-panel-7')).toBeInTheDocument();
    expect(screen.getByText('Answer options')).toBeInTheDocument();
    expect(screen.getByText('Ending alpha')).toBeInTheDocument();
  });
});
