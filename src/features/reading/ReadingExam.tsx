import { useEffect, useRef, useState } from 'react';
import { remainingSeconds } from '../../exam-engine/time';
import type {
  ExamAttemptState,
  PassageTextRange,
} from '../../exam-engine/types';
import { readingModuleFromTest } from '../../test-schema/module-access';
import type { StudentTestPackage } from '../../test-schema/types';
import { QuestionRenderer } from '../../question-types/QuestionRenderer';
import { useExam } from '../exam/ExamProvider';
import { PassageTools } from './PassageTools';
import { segmentsForParagraph } from './passage-annotations';
import { passageRangeFromSelection } from './passage-selection';
import { QuestionNavigator } from './QuestionNavigator';

interface ReadingExamProps {
  test: StudentTestPackage;
  onSubmit?(attempt: ExamAttemptState): void | Promise<void>;
  now?: () => number;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ReadingExam({ test, onSubmit, now = Date.now }: ReadingExamProps) {
  const { state, dispatch } = useExam();
  const [nowMs, setNowMs] = useState(() => now());
  const [pendingSelection, setPendingSelection] = useState<PassageTextRange | null>(null);
  const submittingRef = useRef(false);
  const passageCopyRef = useRef<HTMLDivElement | null>(null);
  const annotationSequenceRef = useRef(0);
  const readingModule = readingModuleFromTest(test);
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
    setNowMs(now());
    if (state.status !== 'ACTIVE') return;

    const timerId = window.setInterval(() => {
      setNowMs(now());
    }, 1_000);

    return () => window.clearInterval(timerId);
  }, [now, state.startedAtMs, state.status]);

  useEffect(() => {
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [activeSection.passage.id]);

  const isReviewed = state.reviewQuestionIds.includes(activeQuestion.id);
  const timeLeft = remainingSeconds(state, nowMs);
  const passageHighlights = state.highlights.filter(
    (highlight) => highlight.passageId === activeSection.passage.id,
  );
  const passageNotes = state.notes.filter(
    (note) => note.passageId === activeSection.passage.id,
  );

  function nextAnnotationId(kind: 'highlight' | 'note'): string {
    annotationSequenceRef.current += 1;
    return [
      kind,
      state.id,
      now(),
      annotationSequenceRef.current,
    ].join('-');
  }

  function capturePassageSelection() {
    if (state.status !== 'ACTIVE' || !passageCopyRef.current) {
      setPendingSelection(null);
      return;
    }

    setPendingSelection(
      passageRangeFromSelection(
        window.getSelection(),
        activeSection.passage.id,
        passageCopyRef.current,
      ),
    );
  }

  function clearPassageSelection() {
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  function addHighlight(selection: PassageTextRange) {
    dispatch({
      type: 'ADD_HIGHLIGHT',
      highlight: {
        ...selection,
        id: nextAnnotationId('highlight'),
      },
    });
    clearPassageSelection();
  }

  function saveNote(body: string, selection: PassageTextRange | null) {
    dispatch({
      type: 'UPSERT_NOTE',
      note: {
        id: nextAnnotationId('note'),
        passageId: activeSection.passage.id,
        paragraphIndex: selection?.paragraphIndex,
        startOffset: selection?.startOffset,
        endOffset: selection?.endOffset,
        quote: selection?.text,
        body,
        updatedAtMs: now(),
      },
    });
    clearPassageSelection();
  }

  function removeHighlightIds(highlightIds: string[]) {
    if (state.status !== 'ACTIVE') return;
    for (const highlightId of highlightIds) {
      dispatch({ type: 'REMOVE_HIGHLIGHT', highlightId });
    }
  }

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
            <PassageTools
              passageTitle={activeSection.passage.title}
              selection={pendingSelection}
              notes={passageNotes}
              disabled={state.status !== 'ACTIVE'}
              onHighlight={addHighlight}
              onSaveNote={saveNote}
              onDeleteNote={(noteId) => dispatch({ type: 'DELETE_NOTE', noteId })}
            />
          </div>
          <div
            ref={passageCopyRef}
            className="passage-copy"
            onMouseUp={capturePassageSelection}
            onKeyUp={capturePassageSelection}
          >
            {activeSection.passage.paragraphs.map((paragraph, paragraphIndex) => {
              const segments = segmentsForParagraph(
                paragraph,
                passageHighlights.filter(
                  (highlight) => highlight.paragraphIndex === paragraphIndex,
                ),
              );

              return (
                <p
                  key={`${activeSection.passage.id}-${paragraphIndex}`}
                  data-paragraph-index={paragraphIndex}
                >
                  {segments.map((segment, segmentIndex) =>
                    segment.highlighted ? (
                      <span
                        key={`${segmentIndex}-${segment.highlightIds.join('-')}`}
                        className="passage-highlight"
                        role={state.status === 'ACTIVE' ? 'button' : undefined}
                        tabIndex={state.status === 'ACTIVE' ? 0 : undefined}
                        title={
                          state.status === 'ACTIVE'
                            ? 'Activate to remove this highlight'
                            : undefined
                        }
                        onClick={() => removeHighlightIds(segment.highlightIds)}
                        onKeyDown={(event) => {
                          if (
                            state.status === 'ACTIVE' &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            removeHighlightIds(segment.highlightIds);
                          }
                        }}
                      >
                        {segment.text}
                      </span>
                    ) : (
                      <span key={segmentIndex}>{segment.text}</span>
                    ),
                  )}
                </p>
              );
            })}
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
            onClick={() => void submitTest(now())}
          >
            Submit test
          </button>
        </div>
      </footer>
    </main>
  );
}
