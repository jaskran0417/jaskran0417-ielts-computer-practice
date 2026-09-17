import { useEffect, useState } from 'react';
import type { ImportFieldRecord } from '../local/import-repository';

interface ConflictEditorProps {
  field: ImportFieldRecord;
  onConfirm(value: string): void;
}

function suggestedValue(field: ImportFieldRecord): string {
  return (
    field.confirmedValue ??
    field.verification.normalizedValue ??
    field.verification.passA?.value ??
    field.verification.passB?.value ??
    ''
  );
}

export function ConflictEditor({ field, onConfirm }: ConflictEditorProps) {
  const [value, setValue] = useState(() => suggestedValue(field));

  useEffect(() => {
    setValue(suggestedValue(field));
  }, [field]);

  return (
    <section className="conflict-editor" aria-labelledby="conflict-editor-title">
      <div>
        <p className="page-eyebrow">Manual review</p>
        <h2 id="conflict-editor-title">Confirm the authoritative value</h2>
        <p className="panel-help">
          Compare the source evidence, correct the text if needed, then confirm it explicitly.
        </p>
      </div>

      <label className="field-stack">
        <span>Confirmed field value</span>
        <textarea
          value={value}
          rows={5}
          onChange={(event) => setValue(event.currentTarget.value)}
          aria-label="Confirmed field value"
        />
      </label>

      <button
        className="primary-action"
        type="button"
        disabled={!value.trim()}
        onClick={() => onConfirm(value.trim())}
      >
        Confirm field
      </button>
    </section>
  );
}
