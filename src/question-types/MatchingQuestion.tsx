import type { MatchingQuestion as Model } from '../test-schema/types';

export function MatchingQuestion({
  question,
  value,
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
      <span className="sr-only">Question {question.number} matching answer</span>
      <select
        aria-label={`Question ${question.number} matching answer`}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Choose an answer</option>
        {question.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.id}. {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
