import type { TextCompletionQuestion as Model } from '../test-schema/types';

export function CompletionQuestion({
  question,
  value = '',
  onChange,
  disabled,
}: {
  question: Model;
  value?: string;
  onChange(value: string): void;
  disabled: boolean;
}) {
  const gap = /_{2,}|\.{3,}|…{2,}|\[\s*\]/.exec(question.prompt);
  const control = question.options?.length ? (
    <select aria-label={`Question ${question.number} answer`} value={value} disabled={disabled}
      onChange={event => onChange(event.currentTarget.value)}>
      <option value="">Choose an answer</option>
      {question.options.map(option => <option key={option.id} value={option.id}>{option.id}. {option.label}</option>)}
    </select>
  ) : (
    <input aria-label={`Question ${question.number} answer`} type="text" value={value}
      disabled={disabled} placeholder={question.placeholder ?? String(question.number)}
      autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
      onChange={event => onChange(event.currentTarget.value)} />
  );
  if (gap && question.type !== 'SHORT_ANSWER') {
    return <label className="inline-completion">
      {question.prompt.slice(0, gap.index)}{control}{question.prompt.slice(gap.index + gap[0].length)}
    </label>;
  }
  return (
    <label className="gap-field">
      <span className="sr-only">Question {question.number} answer</span>
      {control}
    </label>
  );
}
