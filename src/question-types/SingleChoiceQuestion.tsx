import type { SingleChoiceQuestion as SingleChoiceQuestionModel } from '../test-schema/types';

interface SingleChoiceQuestionProps {
  question: SingleChoiceQuestionModel;
  value?: string;
  onChange(value: string): void;
  disabled?: boolean;
}

export function SingleChoiceQuestion({ question, value, onChange, disabled = false }: SingleChoiceQuestionProps) {
  return (
    <fieldset className="question-options">
      <legend className="sr-only">Question {question.number} choices</legend>
      {question.options.map((option) => (
        <label className="choice-row" key={option.id}>
          <input
            type="radio"
            name={question.id}
            value={option.id}
            checked={value === option.id}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />
          <span className="choice-letter">{option.id}</span>
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
