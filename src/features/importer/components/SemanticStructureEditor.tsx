import { useState } from 'react';
import type { SemanticReviewKind } from '../review/semantic-review';

export function SemanticStructureEditor({
  kind,
  initialValue,
  onConfirm,
}: {
  kind: Extract<SemanticReviewKind, 'QUESTION_TEXT' | 'OPTION_LIST'>;
  initialValue: string;
  onConfirm(value: string): void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="semantic-inline-editor">
      <label>
        <span>
          {kind === 'OPTION_LIST' ? 'Confirmed option list' : 'Confirmed semantic value'}
        </span>
        <textarea
          aria-label={
            kind === 'OPTION_LIST' ? 'Confirmed option list' : 'Confirmed semantic value'
          }
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
      </label>
      <small>
        {kind === 'OPTION_LIST'
          ? 'Enter one option per line, for example A. First option.'
          : 'Confirm or correct the question text extracted from the source.'}
      </small>
      <button
        type="button"
        className="primary-action"
        disabled={!value.trim()}
        onClick={() => onConfirm(value.trim())}
      >
        Confirm semantic value
      </button>
    </div>
  );
}
