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
  return (
    <label className="gap-field">
      <span className="sr-only">Question {question.number} answer</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={question.placeholder ?? 'Type your answer'}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
