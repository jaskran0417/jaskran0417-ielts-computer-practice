import type { MultiSelectQuestion as MultiSelectQuestionModel } from '../test-schema/types';

interface Props {
  question: MultiSelectQuestionModel;
  value?: string[];
  onChange(value: string[]): void;
}

export function MultiSelectQuestion({ question, value = [], onChange }: Props) {
  function toggle(optionId: string, checked: boolean) {
    const next = checked
      ? [...value, optionId]
      : value.filter((item) => item !== optionId);
    onChange(next);
  }

  return (
    <fieldset
      className="question-options"
      data-testid="question-type-MULTI_SELECT"
    >
      <legend className="sr-only">Question {question.number} choices</legend>
      {question.options.map((option) => (
        <label className="choice-row" key={option.id}>
          <input
            type="checkbox"
            value={option.id}
            checked={value.includes(option.id)}
            onChange={(event) => toggle(option.id, event.currentTarget.checked)}
          />
          <span className="choice-letter">{option.id}</span>
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
