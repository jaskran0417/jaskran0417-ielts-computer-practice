import type { StudentQuestion } from '../../test-schema/types';
import { useExam } from '../exam/ExamProvider';

interface QuestionNavigatorProps {
  questions: StudentQuestion[];
  onNavigate?(questionId: string): void;
}

function hasAnswer(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}

export function QuestionNavigator({ questions, onNavigate }: QuestionNavigatorProps) {
  const { state, dispatch } = useExam();

  return (
    <nav className="question-navigator" aria-label="Question navigation">
      {questions.map((question) => {
        const answered = hasAnswer(state.answers[question.id]);
        const reviewed = state.reviewQuestionIds.includes(question.id);
        const current = state.currentQuestionId === question.id;

        return (
          <button
            key={question.id}
            type="button"
            aria-label={`Question ${question.number}`}
            aria-current={current ? 'step' : undefined}
            className={`question-chip${current ? ' current' : ''}${reviewed ? ' review' : ''}`}
            data-testid={`question-${question.number}-status`}
            data-state={answered ? 'answered' : 'unanswered'}
            data-review={reviewed ? 'true' : 'false'}
            onClick={() => {
              dispatch({ type: 'NAVIGATE', questionId: question.id });
              onNavigate?.(question.id);
            }}
          >
            <span>{question.number}</span>
            <span className="question-chip-dot" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
