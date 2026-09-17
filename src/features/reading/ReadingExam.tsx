import { useEffect, useState } from 'react';
import { remainingSeconds } from '../../exam-engine/time';
import type { StudentQuestion, StudentTestPackage } from '../../test-schema/types';
import { GapFillQuestion } from '../../question-types/GapFillQuestion';
import { SingleChoiceQuestion } from '../../question-types/SingleChoiceQuestion';
import { useExam } from '../exam/ExamProvider';
import { QuestionNavigator } from './QuestionNavigator';

interface ReadingExamProps {
  test: StudentTestPackage;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderQuestion(
  question: StudentQuestion,
  value: string | string[] | undefined,
  onChange: (value: string) => void,
) {
  if (question.type === 'SINGLE_CHOICE') {
    return (
      <SingleChoiceQuestion
        question={question}
        value={typeof value === 'string' ? value : undefined}
        onChange={onChange}
      />
    );
  }

  return (
    <GapFillQuestion
      question={question}
      value={typeof value === 'string' ? value : undefined}
      onChange={onChange}
    />
  );
}

export function ReadingExam({ test }: ReadingExamProps) {
  const { state, dispatch } = useExam();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const readingModule = test.modules[0];
  const allQuestions = readingModule.sections.flatMap((section) =>
    section.questionGroups.flatMap((group) => group.questions),
  );

  const activeSection =
    readingModule.sections.find((section) =>
      section.questionGroups.some((group) =>
        group.questions.some((question) => question.id === state.currentQuestionId),
      ),
    ) ?? readingModule.sections[0];

  const activeGroup = activeSection.questionGroups.find((group) =>
    group.questions.some((question) => question.id === state.currentQuestionId),
  );
  const activeQuestion = allQuestions.find((question) => question.id === state.currentQuestionId);

  if (!activeGroup || !activeQuestion) {
    throw new Error('Current question is not present in the Reading test');
  }

  useEffect(() => {
    setNowMs(Date.now());
    if (state.status !== 'ACTIVE') return;

    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => window.clearInterval(timerId);
  }, [state.startedAtMs, state.status]);

  const isReviewed = state.reviewQuestionIds.includes(activeQuestion.id);
  const timeLeft = remainingSeconds(state, nowMs);

  useEffect(() => {
    if (state.status === 'ACTIVE' && timeLeft === 0) {
      dispatch({ type: 'SUBMIT', submittedAtMs: nowMs });
    }
  }, [dispatch, nowMs, state.status, timeLeft]);

  return (
    <main className="exam-shell">
      <header className="exam-header">
        <div>
          <span className="exam-kicker">Computer Test Practice</span>
          <h1>{readingModule.title}</h1>
        </div>
        <div className="timer" aria-label={`${timeLeft} seconds remaining`}>
          <span>Time remaining</span>
          <strong>{formatTime(timeLeft)}</strong>
        </div>
      </header>

      <section className="reading-workspace">
        <article className="passage-pane" aria-label="Reading passage">
          <div className="pane-heading">
            <span>{activeSection.title}</span>
            <h2>{activeSection.passage.title}</h2>
          </div>
          <div className="passage-copy">
            {activeSection.passage.paragraphs.map((paragraph, index) => (
              <p key={`${activeSection.passage.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        <section className="questions-pane" aria-label="Questions">
          <div className="question-instruction">{activeGroup.instruction}</div>
          <div className="question-card">
            <div className="question-title-row">
              <h2>Question {activeQuestion.number}</h2>
              <button
                type="button"
                className={`review-button${isReviewed ? ' active' : ''}`}
                aria-label={`${isReviewed ? 'Unmark' : 'Mark'} question ${activeQuestion.number} for review`}
                onClick={() => dispatch({ type: 'TOGGLE_REVIEW', questionId: activeQuestion.id })}
                disabled={state.status !== 'ACTIVE'}
              >
                {isReviewed ? 'Marked for review' : 'Mark for review'}
              </button>
            </div>
            <p className="question-prompt">{activeQuestion.prompt}</p>
            {renderQuestion(activeQuestion, state.answers[activeQuestion.id], (value) =>
              dispatch({ type: 'ANSWER_CHANGED', questionId: activeQuestion.id, value })
            )}
          </div>
        </section>
      </section>

      <footer className="exam-footer">
        <QuestionNavigator questions={allQuestions} />
        <div className="footer-status">
          <span className="status-key"><i className="answered-key" /> Answered</span>
          <span className="status-key"><i className="review-key" /> Review</span>
        </div>
      </footer>
    </main>
  );
}
