import { useMemo, useState } from 'react';
import type {
  DiagramLabelQuestion,
  MatchingQuestion,
  QuestionGroup,
  StudentQuestion,
  TableCompletionQuestion,
} from '../../test-schema/types';
import { QuestionRenderer } from '../../question-types/QuestionRenderer';
import { MatchingTask } from './MatchingTask';
import { imageContentCrop } from '../../question-types/visual-content-crop';
import type { NormalizedQuestionRect } from '../../test-schema/types';
import {
  anchorWithinCrop,
  visualPresentationCrop,
  type VisualPresentationKind,
} from '../../question-types/visual-layout';

type AnswerValue = string | string[] | undefined;

interface ReadingQuestionGroupProps {
  group: QuestionGroup;
  activeQuestionId: string;
  answers: Record<string, string | string[]>;
  reviewQuestionIds: string[];
  disabled: boolean;
  assetUrlById: Record<string, string>;
  onNavigate(questionId: string): void;
  onAnswer(questionId: string, value: string | string[]): void;
  onToggleReview(questionId: string): void;
}

function isVisualQuestion(
  question: StudentQuestion,
): question is DiagramLabelQuestion | TableCompletionQuestion {
  return (
    question.type === 'DIAGRAM_LABEL_COMPLETION' ||
    question.type === 'TABLE_COMPLETION'
  );
}

function isMatchingQuestion(question: StudentQuestion): question is MatchingQuestion {
  return (
    question.type === 'MATCHING_INFORMATION' ||
    question.type === 'MATCHING_HEADINGS' ||
    question.type === 'MATCHING_FEATURES' ||
    question.type === 'MATCHING_SENTENCE_ENDINGS'
  );
}

function VisualQuestionGroup({
  questions,
  activeQuestionId,
  answers,
  reviewQuestionIds,
  disabled,
  assetUrlById,
  onNavigate,
  onAnswer,
  onToggleReview,
}: Omit<ReadingQuestionGroupProps, 'group'> & {
  questions: Array<DiagramLabelQuestion | TableCompletionQuestion>;
}) {
  const kind: VisualPresentationKind =
    questions[0]?.type === 'TABLE_COMPLETION' ? 'TABLE' : 'DIAGRAM';
  const [fullImage, setFullImage] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [imageFailed, setImageFailed] = useState(false);
  const [contentCrop, setContentCrop] = useState<NormalizedQuestionRect | null>(null);
  const suggestedCrop = useMemo(
    () => visualPresentationCrop(questions.map((question) => question.anchor), kind),
    [questions, kind],
  );
  const crop = fullImage ? { x: 0, y: 0, width: 1, height: 1 } : contentCrop ?? suggestedCrop;
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const assetId = questions[0]?.assetId;
  const assetUrl = assetId ? assetUrlById[assetId] : undefined;
  const cropRatio = naturalRatio
    ? (naturalRatio * crop.width) / crop.height
    : kind === 'DIAGRAM'
      ? 1.3
      : 1.8;

  if (!assetUrl) {
    return <div className="visual-question-error" role="alert">Visual asset unavailable</div>;
  }

  return (
    <div className="visual-group-shell">
      <div className="visual-toolbar" aria-label="Image controls">
        <button type="button" onClick={() => setFullImage(value => !value)}>
          {fullImage ? 'Focus on answers' : 'Show full image'}
        </button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 100} onClick={() => setZoom(value => Math.max(100, value - 25))}>−</button>
        <output aria-label="Image zoom">{zoom}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(value => Math.min(200, value + 25))}>+</button>
      </div>
      {imageFailed && <p role="alert">The image could not load. Your answers are retained.</p>}
      <div className="visual-scroll-area">
      <div
        className="visual-group-stage"
        data-testid="visual-question-group"
        style={{ aspectRatio: String(cropRatio), width: `${zoom}%` }}
        data-visual-kind={kind.toLowerCase()}
      >
        <img
          src={assetUrl}
          alt={kind === 'DIAGRAM' ? 'Question diagram' : 'Question table'}
          onError={() => setImageFailed(true)}
          style={{
            left: `${(-crop.x / crop.width) * 100}%`,
            top: `${(-crop.y / crop.height) * 100}%`,
            width: `${100 / crop.width}%`,
          }}
          onLoad={(event) => {
            const image = event.currentTarget;
            setImageFailed(false);
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setNaturalRatio(image.naturalWidth / image.naturalHeight);
              setContentCrop(imageContentCrop(image, questions.map(question => question.anchor)));
            }
          }}
        />
        {questions.map((question) => {
          const anchor = anchorWithinCrop(question.anchor, crop);
          const active = question.id === activeQuestionId;
          return (
            <label
              key={question.id}
              data-question-id={question.id}
              className={`visual-group-answer${active ? ' active' : ''}`}
              style={{
                left: `${anchor.x * 100}%`,
                top: `${anchor.y * 100}%`,
                width: `${anchor.width * 100}%`,
                minHeight: `${anchor.height * 100}%`,
              }}
              onFocus={() => onNavigate(question.id)}
            >
              <span className="visual-group-number">{question.number}</span>
              <input
                aria-label={`Question ${question.number} answer`}
                type="text"
                value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
                disabled={disabled}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => onAnswer(question.id, event.currentTarget.value)}
              />
            </label>
          );
        })}
      </div>
      </div>

      <div className="visual-group-mobile-answers" aria-label="Visual question answers">
        {questions.map((question) => {
          const active = question.id === activeQuestionId;
          const reviewed = reviewQuestionIds.includes(question.id);
          return (
            <div
              key={question.id}
              className={`visual-mobile-answer${active ? ' active' : ''}`}
              onClick={() => onNavigate(question.id)}
            >
              <span className="question-number-badge">{question.number}</span>
              <span className="visual-mobile-answer-label">Answer on visual</span>
              <button
                type="button"
                className={`review-button compact${reviewed ? ' active' : ''}`}
                aria-label={`${reviewed ? 'Unmark' : 'Mark'} question ${question.number} for review`}
                aria-pressed={reviewed}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleReview(question.id);
                }}
              >
                {reviewed ? 'Review ✓' : 'Review'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchingOptionBank({ question }: { question: MatchingQuestion }) {
  return (
    <details className="matching-option-bank" open>
      <summary>Answer options</summary>
      <div className="matching-option-grid">
        {question.options.map((option) => (
          <div key={option.id}>
            <strong>{option.id}</strong>
            <span>{option.label}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function ReadingQuestionGroup({
  group,
  activeQuestionId,
  answers,
  reviewQuestionIds,
  disabled,
  assetUrlById,
  onNavigate,
  onAnswer,
  onToggleReview,
}: ReadingQuestionGroupProps) {
  if (group.questions.length > 0 && group.questions.every(isMatchingQuestion)) {
    return <MatchingTask groupId={group.id} questions={group.questions} answers={answers}
      activeQuestionId={activeQuestionId} reviewQuestionIds={reviewQuestionIds} disabled={disabled}
      onAnswer={onAnswer} onNavigate={onNavigate} onToggleReview={onToggleReview} />;
  }
  const visualQuestions = group.questions.filter(isVisualQuestion);
  const isSharedVisualGroup =
    visualQuestions.length === group.questions.length &&
    visualQuestions.length > 0 &&
    new Set(visualQuestions.map((question) => question.assetId)).size === 1;

  if (isSharedVisualGroup) {
    return (
      <VisualQuestionGroup
        questions={visualQuestions}
        activeQuestionId={activeQuestionId}
        answers={answers}
        reviewQuestionIds={reviewQuestionIds}
        disabled={disabled}
        assetUrlById={assetUrlById}
        onNavigate={onNavigate}
        onAnswer={onAnswer}
        onToggleReview={onToggleReview}
      />
    );
  }

  const matching = group.questions.find(isMatchingQuestion);

  return (
    <>
      {matching ? <MatchingOptionBank question={matching} /> : null}
      <div className="question-group-list">
        {group.questions.map((question) => {
          const active = question.id === activeQuestionId;
          const reviewed = reviewQuestionIds.includes(question.id);
          const value: AnswerValue = answers[question.id];

          return (
            <article
              key={question.id}
              data-question-id={question.id}
              data-testid={`question-panel-${question.number}`}
              data-active={active ? 'true' : 'false'}
              className={`question-item${active ? ' active' : ''}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => onNavigate(question.id)}
              onFocusCapture={() => onNavigate(question.id)}
            >
              <div className="question-item-heading">
                <span className="question-number-badge">{question.number}</span>
                <button
                  type="button"
                  className={`review-button compact${reviewed ? ' active' : ''}`}
                  aria-label={`${reviewed ? 'Unmark' : 'Mark'} question ${question.number} for review`}
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleReview(question.id);
                  }}
                >
                  {reviewed ? 'Marked for review' : 'Mark for review'}
                </button>
              </div>
              {!(['SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'FLOW_CHART_COMPLETION'].includes(question.type)
                && /_{2,}|\.{3,}|…{2,}|\[\s*\]/.test(question.prompt)) && <p className="question-prompt">{question.prompt}</p>}
              <QuestionRenderer
                question={question}
                value={value}
                disabled={disabled}
                assetUrlById={assetUrlById}
                onChange={(nextValue) => onAnswer(question.id, nextValue)}
              />
            </article>
          );
        })}
      </div>
    </>
  );
}
