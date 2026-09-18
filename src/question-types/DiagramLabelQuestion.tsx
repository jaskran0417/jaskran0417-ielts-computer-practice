import type { DiagramLabelQuestion as DiagramLabelQuestionModel } from '../test-schema/types';

interface Props {
  question: DiagramLabelQuestionModel;
  value?: string;
  onChange(value: string): void;
}

export function DiagramLabelQuestion({ question, value = '', onChange }: Props) {
  return (
    <div
      className="diagram-label-question"
      data-testid="question-type-DIAGRAM_LABEL_COMPLETION"
      data-asset-id={question.assetId}
    >
      <div className="diagram-asset-reference" aria-label="Diagram source">
        Diagram asset: {question.assetId}
      </div>
      <label className="gap-field">
        <span className="sr-only">Question {question.number} diagram label</span>
        <input
          type="text"
          value={value}
          placeholder={question.placeholder ?? 'Type your answer'}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    </div>
  );
}
