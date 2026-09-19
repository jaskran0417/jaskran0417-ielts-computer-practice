import type { MultiSelectQuestion as Model } from '../test-schema/types';

export function MultiSelectQuestion({
  question,
  value = [],
  onChange,
  disabled,
}: {
  question: Model;
  value?: string[];
  onChange(value: string[]): void;
  disabled: boolean;
}) {
  function toggle(optionId: string) {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
      return;
    }

    if (value.length >= question.maxSelections) return;
    onChange([...value, optionId]);
  }

  return (
    <fieldset className="question-options" disabled={disabled}>
      <legend className="sr-only">Question {question.number} multiple choice</legend>
      <p className="selection-count" role="status">{value.length} of {question.maxSelections} selected</p>
      {question.options.map((option) => (
        <label className="choice-row" key={option.id}>
          <input
            type="checkbox"
            checked={value.includes(option.id)}
            disabled={!value.includes(option.id) && value.length >= question.maxSelections}
            onChange={() => toggle(option.id)}
          />
          <span className="choice-letter">{option.id}</span>
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
