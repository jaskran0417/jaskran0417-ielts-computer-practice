import type { SingleChoiceQuestion as SingleChoiceQuestionModel } from '../test-schema/types';

interface SingleChoiceQuestionProps {
  question: SingleChoiceQuestionModel;
  value?: string;
  onChange(value: string): void;
}

export function SingleChoiceQuestion({ question, value, onChange }: SingleChoiceQuestionProps) {
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
            onChange={() => onChange(option.id)}
          />
          <span className="choice-letter">{option.id}</span>
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
