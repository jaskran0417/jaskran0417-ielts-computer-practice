import type { YesNoNotGivenQuestion as Model } from '../test-schema/types';

export function YesNoNotGivenQuestion({
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
    ['YES', 'Yes'],
    ['NO', 'No'],
    ['NOT_GIVEN', 'Not Given'],
  ] as const;

  return (
    <fieldset className="question-options" disabled={disabled}>
      <legend className="sr-only">Question {question.number} Yes No Not Given</legend>
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
