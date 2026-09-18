import type { TableCompletionQuestion as Model } from '../test-schema/types';

function overlayStyle(anchor: Model['anchor']) {
  return {
    left: `${anchor.x * 100}%`,
    top: `${anchor.y * 100}%`,
    width: `${anchor.width * 100}%`,
    minHeight: `${anchor.height * 100}%`,
  };
}

export function TableCompletionQuestion({
  question,
  value = '',
  onChange,
  disabled,
  assetUrl,
}: {
  question: Model;
  value?: string;
  onChange(value: string): void;
  disabled: boolean;
  assetUrl?: string;
}) {
  return (
    <figure
      className="visual-question"
      data-table-id={question.tableId}
      data-cell-id={question.cellId}
    >
      {assetUrl ? (
        <img src={assetUrl} alt={`Question ${question.number} table`} />
      ) : (
        <div role="alert">Table asset unavailable</div>
      )}
      <label className="visual-answer-anchor" style={overlayStyle(question.anchor)}>
        <span className="sr-only">Question {question.number} answer</span>
        <input
          aria-label={`Question ${question.number} answer`}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={question.placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    </figure>
  );
}
