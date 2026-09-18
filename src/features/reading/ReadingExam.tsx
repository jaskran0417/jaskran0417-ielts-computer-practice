import { useEffect, useRef, useState } from 'react';
import { remainingSeconds } from '../../exam-engine/time';
import type { ExamAttemptState } from '../../exam-engine/types';
import type { StudentTestPackage } from '../../test-schema/types';
import { QuestionRenderer } from '../../question-types/QuestionRenderer';
import { useExam } from '../exam/ExamProvider';
import { QuestionNavigator } from './QuestionNavigator';

interface ReadingExamProps {
  test: StudentTestPackage;
  onSubmit?(attempt: ExamAttemptState): void | Promise<void>;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ReadingExam({ test, onSubmit }: ReadingExamProps) {
  const { state, dispatch } = useExam();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const submittingRef = useRef(false);
  const readingModule = test.modules[0];
  const assetUrlById = Object.fromEntries(
    (test.assets ?? []).map((asset) => [asset.id, asset.url]),
  );
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

  async function submitTest(submittedAtMs: number) {
    if (state.status !== 'ACTIVE' || submittingRef.current) return;

    submittingRef.current = true;
    const submittedAttempt: ExamAttemptState = {
      ...state,
      status: 'SUBMITTED',
      submittedAtMs,
    };
    dispatch({ type: 'SUBMIT', submittedAtMs });

    try {
      await onSubmit?.(submittedAttempt);
    } finally {
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    if (state.status === 'ACTIVE' && timeLeft === 0) {
      void submitTest(nowMs);
    }
  }, [nowMs, state.status, timeLeft]);

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
            <QuestionRenderer
              question={activeQuestion}
              value={state.answers[activeQuestion.id]}
              disabled={state.status !== 'ACTIVE'}
              assetUrlById={assetUrlById}
              onChange={(value) =>
                dispatch({ type: 'ANSWER_CHANGED', questionId: activeQuestion.id, value })
              }
            />
          </div>
        </section>
      </section>

      <footer className="exam-footer">
        <QuestionNavigator questions={allQuestions} />
        <div className="footer-status">
          <span className="status-key"><i className="answered-key" /> Answered</span>
          <span className="status-key"><i className="review-key" /> Review</span>
          <button
            type="button"
            className="primary-action"
            disabled={state.status !== 'ACTIVE'}
            onClick={() => void submitTest(Date.now())}
          >
            Submit test
          </button>
        </div>
      </footer>
    </main>
  );
}
