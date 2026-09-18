import type { GapFillQuestion as GapFillQuestionModel } from '../test-schema/types';

interface GapFillQuestionProps {
  question: GapFillQuestionModel;
  value?: string;
  onChange(value: string): void;
  disabled?: boolean;
}

export function GapFillQuestion({ question, value = '', onChange, disabled = false }: GapFillQuestionProps) {
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
