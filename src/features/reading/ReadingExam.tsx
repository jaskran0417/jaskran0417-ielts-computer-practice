import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SessionMode } from '../../session/types';
import './exam-experience.css';
import { isQuestionAnswered } from './answer-completeness';
import { remainingSeconds } from '../../exam-engine/time';
import type {
  ExamAttemptState,
  PassageTextRange,
} from '../../exam-engine/types';
import type { StudentTestPackage } from '../../test-schema/types';
import { useExam } from '../exam/ExamProvider';
import { PassageTools } from './PassageTools';
import { segmentsForParagraph } from './passage-annotations';
import { passageRangeFromSelection } from './passage-selection';
import { QuestionNavigator } from './QuestionNavigator';
import { ReadingQuestionGroup } from './ReadingQuestionGroup';
import { readingGroupDisplayInstruction } from './reading-presentation';

interface ReadingExamProps {
  test: StudentTestPackage;
  onSubmit?(attempt: ExamAttemptState): void | Promise<void>;
  now?: () => number;
  mode?: SessionMode;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ReadingExam({ test, onSubmit, now = Date.now, mode = 'PRACTICE' }: ReadingExamProps) {
  const { state, dispatch, saveStatus, retrySave } = useExam();
  const [textSize, setTextSize] = useState(16);
  const [showHelp, setShowHelp] = useState(false);
  const questionsPaneRef = useRef<HTMLElement | null>(null);
  const passagePaneRef = useRef<HTMLElement | null>(null);
  const [nowMs, setNowMs] = useState(() => now());
  const [pendingSelection, setPendingSelection] = useState<PassageTextRange | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [mobilePane, setMobilePane] = useState<'PASSAGE' | 'QUESTIONS'>('QUESTIONS');
  const submittingRef = useRef(false);
  const passageCopyRef = useRef<HTMLDivElement | null>(null);
  const annotationSequenceRef = useRef(0);
  const keepWorkingButtonRef = useRef<HTMLButtonElement | null>(null);
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

  const activeIndex = allQuestions.findIndex(question => question.id === activeQuestion.id);
  const sectionQuestions = activeSection.questionGroups.flatMap(group => group.questions);
  function navigateTo(questionId: string) {
    dispatch({ type: 'NAVIGATE', questionId });
    setMobilePane('QUESTIONS');
    window.requestAnimationFrame(() => {
      const target = Array.from(questionsPaneRef.current?.querySelectorAll<HTMLElement>('[data-question-id]') ?? [])
        .find(element => element.dataset.questionId === questionId);
      target?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
      target?.querySelector<HTMLElement>('input, select, .matching-dropzone')?.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    if (passagePaneRef.current) passagePaneRef.current.scrollTop = 0;
    if (questionsPaneRef.current) questionsPaneRef.current.scrollTop = 0;
  }, [activeSection.id]);
  const timeLeft = remainingSeconds(state, nowMs);
  const timeUrgency =
    state.durationSeconds > 0 && timeLeft / state.durationSeconds <= 0.1
      ? 'critical'
      : state.durationSeconds > 0 && timeLeft / state.durationSeconds <= 0.25
        ? 'warning'
        : null;
  const unansweredCount = useMemo(
    () =>
      allQuestions.filter(question => !isQuestionAnswered(question, state.answers[question.id])).length,
    [allQuestions, state.answers],
  );
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

  useEffect(() => {
    if (showSubmitConfirm) {
      keepWorkingButtonRef.current?.focus();
    }
  }, [showSubmitConfirm]);

  useEffect(() => {
    if (!showSubmitConfirm) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowSubmitConfirm(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSubmitConfirm]);

  return (
    <main className="exam-shell authentic-exam" style={{ '--exam-text-size': `${textSize}px` } as CSSProperties}>
      <header className="exam-header">
        <div>
          <span className="exam-kicker">{mode === 'MOCK' ? 'Mock test' : 'Practice'} · IELTS-style computer test</span>
          <h1>{readingModule.title}</h1>
        </div>
        <div className="exam-header-tools">
          <label className="exam-text-size">Text size
            <select aria-label="Text size" value={textSize} onChange={event => setTextSize(Number(event.target.value))}>
              <option value={16}>Standard</option><option value={18}>Large</option><option value={20}>Extra large</option>
            </select>
          </label>
          <button type="button" className="exam-help-button" aria-expanded={showHelp} onClick={() => setShowHelp(value => !value)}>Help</button>
        </div>
        <div
          className={`timer${timeUrgency ? ` timer-${timeUrgency}` : ''}`}
          aria-label={`${timeLeft} seconds remaining`}
        >
          <span>Time remaining</span>
          <strong>{formatTime(timeLeft)}</strong>
        </div>
      </header>

      <div className="exam-session-bar">
        <span>{allQuestions.length - unansweredCount} of {allQuestions.length} answered</span>
        {saveStatus === 'ERROR' ? <span role="alert" className="save-error">Answers are not saved. <button type="button" onClick={retrySave}>Retry saving</button></span>
          : <span role="status">{saveStatus === 'SAVING' ? 'Saving answers…' : 'All answers saved'}</span>}
      </div>
      {showHelp && <aside className="exam-help-panel" aria-label="Test help">
        <strong>Working through your test</strong>
        <p>Read the instructions for each question group. Select one answer for radio questions or the requested number for checkboxes. Type into gaps; for matching, choose a bank option then an answer space, or drag it there.</p>
        <p>Move freely between parts and questions. Review marks are reminders, not answers. Select passage text to highlight it or add a note. The timer keeps running while you review or refresh.</p>
        <button type="button" onClick={() => setShowHelp(false)}>Close help</button>
      </aside>}
      <nav className="mobile-pane-switcher" aria-label="Reading view">
        <button
          type="button"
          aria-pressed={mobilePane === 'PASSAGE'}
          className={mobilePane === 'PASSAGE' ? 'active' : ''}
          onClick={() => setMobilePane('PASSAGE')}
        >
          Passage
        </button>
        <button
          type="button"
          aria-pressed={mobilePane === 'QUESTIONS'}
          className={mobilePane === 'QUESTIONS' ? 'active' : ''}
          onClick={() => setMobilePane('QUESTIONS')}
        >
          Questions
        </button>
      </nav>

      <section className="reading-workspace" data-mobile-pane={mobilePane.toLowerCase()}>
        <article ref={passagePaneRef} className="passage-pane" aria-label="Reading passage">
          <div className="pane-heading">
            <span>Part {readingModule.sections.indexOf(activeSection) + 1}</span>
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
            onTouchEnd={() => window.setTimeout(capturePassageSelection, 80)}
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

        <section ref={questionsPaneRef} className="questions-pane" aria-label="Questions">
          {activeSection.questionGroups.map(group => <section className="exam-question-group" key={group.id} aria-label={`Questions ${group.questions[0]?.number} to ${group.questions[group.questions.length - 1]?.number}`}>
            <header className="question-group-header">
              <h2>Questions {group.questions[0]?.number}–{group.questions[group.questions.length - 1]?.number}</h2>
              <p>{readingGroupDisplayInstruction(group.instruction)}</p>
            </header>
            <ReadingQuestionGroup
              group={group}
              activeQuestionId={activeQuestion.id}
              answers={state.answers}
              reviewQuestionIds={state.reviewQuestionIds}
              disabled={state.status !== 'ACTIVE'}
              assetUrlById={assetUrlById}
              onNavigate={questionId => {
                if (questionId !== state.currentQuestionId) dispatch({ type: 'NAVIGATE', questionId });
              }}
              onAnswer={(questionId, value) => dispatch({ type: 'ANSWER_CHANGED', questionId, value })}
              onToggleReview={questionId => dispatch({ type: 'TOGGLE_REVIEW', questionId })}
            />
          </section>)}
        </section>
      </section>

      <footer className="exam-footer">
        <div className="exam-navigation-main">
          <nav className="exam-part-tabs" aria-label="Reading parts">
            {readingModule.sections.map((section, index) => {
              const questions = section.questionGroups.flatMap(group => group.questions);
              const answered = questions.filter(question => isQuestionAnswered(question, state.answers[question.id])).length;
              return <button type="button" key={section.id} aria-current={section.id === activeSection.id ? 'page' : undefined}
                onClick={() => { if (questions[0]) navigateTo(questions[0].id); }}>
                Part {index + 1} <small>{answered}/{questions.length}</small>
              </button>;
            })}
          </nav>
          <QuestionNavigator questions={sectionQuestions} onNavigate={navigateTo} />
        </div>
        <div className="footer-status">
          <button type="button" aria-label="Previous question" disabled={activeIndex <= 0} onClick={() => navigateTo(allQuestions[activeIndex - 1].id)}>←</button>
          <button type="button" aria-label="Next question" disabled={activeIndex >= allQuestions.length - 1} onClick={() => navigateTo(allQuestions[activeIndex + 1].id)}>→</button>
          <button
            type="button"
            className="primary-action"
            disabled={state.status !== 'ACTIVE'}
            onClick={() => setShowSubmitConfirm(true)}
          >
            Submit test
          </button>
        </div>
      </footer>

      {showSubmitConfirm ? (
        <div className="submit-confirm-overlay">
          <div
            className="submit-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="submit-confirm-title"
            aria-describedby="submit-confirm-body"
          >
            <h2 id="submit-confirm-title">Submit this test?</h2>
            <p id="submit-confirm-body">
              {unansweredCount > 0
                ? `You have ${unansweredCount} unanswered ${unansweredCount === 1 ? 'question' : 'questions'}. Once submitted, you can no longer change any answers.`
                : 'All questions are answered. Once submitted, you can no longer change any answers.'}
            </p>
            <div className="submit-confirm-actions">
              <button
                type="button"
                className="secondary-action"
                ref={keepWorkingButtonRef}
                onClick={() => setShowSubmitConfirm(false)}
              >
                Keep working
              </button>
              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  void submitTest(now());
                }}
              >
                Submit test now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
