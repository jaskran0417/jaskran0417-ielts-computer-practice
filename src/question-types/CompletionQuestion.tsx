import type { CompletionQuestion as CompletionQuestionModel } from '../test-schema/types';

interface Props {
  question: CompletionQuestionModel;
  value?: string;
  onChange(value: string): void;
}

export function CompletionQuestion({ question, value = '', onChange }: Props) {
  return (
    <label
      className="gap-field"
      data-testid={`question-type-${question.type}`}
    >
      <span className="sr-only">Question {question.number} answer</span>
      <input
        type="text"
        value={value}
        placeholder={question.placeholder ?? 'Type your answer'}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
