import { useState } from 'react';

export function SemanticAnswerEditor({
  initialValue,
  onConfirm,
}: {
  initialValue: string;
  onConfirm(value: string): void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="semantic-inline-editor">
      <label>
        <span>Accepted answers</span>
        <textarea
          aria-label="Accepted answers"
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
      </label>
      <small>Separate accepted alternatives with |. The first value is canonical.</small>
      <button
        type="button"
        className="primary-action"
        disabled={!value.trim()}
        onClick={() => onConfirm(value.trim())}
      >
        Confirm accepted answers
      </button>
    </div>
  );
}
