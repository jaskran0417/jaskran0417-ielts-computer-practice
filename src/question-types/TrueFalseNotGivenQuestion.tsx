import type { TrueFalseNotGivenQuestion as Model } from '../test-schema/types';

export function TrueFalseNotGivenQuestion({
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
  const options = [
    ['TRUE', 'True'],
    ['FALSE', 'False'],
    ['NOT_GIVEN', 'Not Given'],
  ] as const;

  return (
    <fieldset className="question-options" disabled={disabled}>
      <legend className="sr-only">Question {question.number} True False Not Given</legend>
      {options.map(([id, label]) => (
        <label className="choice-row" key={id}>
          <input
            type="radio"
            name={question.id}
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
