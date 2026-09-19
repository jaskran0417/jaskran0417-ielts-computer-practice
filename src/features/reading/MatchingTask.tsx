import { useState } from 'react';
import type { MatchingQuestion } from '../../test-schema/types';

interface Props {
  groupId: string;
  questions: MatchingQuestion[];
  activeQuestionId: string;
  answers: Record<string, string | string[]>;
  reviewQuestionIds: string[];
  disabled: boolean;
  onAnswer(id: string, value: string): void;
  onNavigate(id: string): void;
  onToggleReview(id: string): void;
}

export function MatchingTask({ groupId, questions, answers, activeQuestionId, disabled,
  reviewQuestionIds, onAnswer, onNavigate, onToggleReview }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const options = questions[0].options;
  const reusable = questions.every(question => question.allowOptionReuse);
  const used = (optionId: string, except?: string) => questions.some(question =>
    question.id !== except && answers[question.id] === optionId);

  function assign(question: MatchingQuestion, optionId: string | null) {
    if (disabled) return;
    onNavigate(question.id);
    if (!optionId) { setMessage('Choose an option from the bank, then choose an answer space.'); return; }
    if (!question.options.some(option => option.id === optionId)) return;
    if (!question.allowOptionReuse && used(optionId, question.id)) {
      setMessage('That option is already used. Clear its answer before moving it.');
      return;
    }
    onAnswer(question.id, optionId);
    setSelected(null);
    setMessage(`Question ${question.number} answered with ${optionId}.`);
  }

  return <div className="matching-task">
    <div className="matching-bank" aria-label="Answer options">
      <h3>Answer options</h3>
      <p>Choose an option, then an answer space. You can also drag an option into place.
        {reusable ? ' Options may be used more than once.' : ' Use each option once.'}</p>
      <div className="matching-bank-options">
        {options.map(option => <button type="button" key={option.id}
          aria-label={`${option.id}. ${option.label}`} aria-pressed={selected === option.id}
          disabled={disabled || (!reusable && used(option.id))}
          draggable={!disabled && (reusable || !used(option.id))}
          onDragStart={event => {
            event.dataTransfer.setData('text/plain', JSON.stringify({ groupId, optionId: option.id }));
            event.dataTransfer.effectAllowed = 'copy';
            setSelected(option.id);
          }} onClick={() => { setSelected(option.id); setMessage(`Option ${option.id} selected. Choose an answer space.`); }}>
          <strong>{option.id}</strong><span>{option.label}</span>
        </button>)}
      </div>
      <p className="matching-feedback" role="status">{message || 'No option selected.'}</p>
    </div>
    <div className="matching-answers">
      {questions.map(question => {
        const option = question.options.find(item => item.id === answers[question.id]);
        const reviewed = reviewQuestionIds.includes(question.id);
        return <article key={question.id} data-question-id={question.id}
          data-testid={`question-panel-${question.number}`} data-active={activeQuestionId === question.id}
          className={`matching-answer-row${activeQuestionId === question.id ? ' active' : ''}`}>
          <div className="question-item-heading"><strong className="question-number-badge">{question.number}</strong>
            <button type="button" className={`review-button compact${reviewed ? ' active' : ''}`}
              aria-label={`${reviewed ? 'Unmark' : 'Mark'} question ${question.number} for review`}
              aria-pressed={reviewed} disabled={disabled} onClick={() => onToggleReview(question.id)}>Review</button>
          </div>
          <p className="question-prompt">{question.prompt}</p>
          <button type="button" className={`matching-dropzone${option ? ' filled' : ''}`}
            aria-label={`Question ${question.number} matching answer`} disabled={disabled}
            onDragOver={event => { if (!disabled) event.preventDefault(); }}
            onDrop={event => {
              event.preventDefault();
              try {
                const payload = JSON.parse(event.dataTransfer.getData('text/plain'));
                if (payload.groupId === groupId && typeof payload.optionId === 'string') assign(question, payload.optionId);
              } catch { /* Ignore unrelated drops. */ }
            }} onClick={() => assign(question, selected)}>
            {option ? `${option.id}. ${option.label}` : 'Choose or drop an answer here'}
          </button>
          {option && <button type="button" className="clear-answer" disabled={disabled}
            aria-label={`Clear question ${question.number} answer`} onClick={() => {
              onAnswer(question.id, ''); setMessage(`Question ${question.number} cleared.`);
            }}>Clear</button>}
        </article>;
      })}
    </div>
  </div>;
}
