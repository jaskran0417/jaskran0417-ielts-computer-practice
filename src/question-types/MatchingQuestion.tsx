import type { MatchingQuestion as MatchingQuestionModel } from '../test-schema/types';

interface Props {
  question: MatchingQuestionModel;
  value?: string;
  onChange(value: string): void;
}

export function MatchingQuestion({ question, value = '', onChange }: Props) {
  return (
    <label
      className="gap-field"
      data-testid={`question-type-${question.type}`}
    >
      <span className="sr-only">Question {question.number} match</span>
      <select
        value={value}
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
