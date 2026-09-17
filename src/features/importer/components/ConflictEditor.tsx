import { useEffect, useState } from 'react';
import type { ImportFieldRecord } from '../local/import-repository';

function initialValue(field: ImportFieldRecord): string {
  return (
    field.confirmedValue ??
    field.verification.normalizedValue ??
    field.verification.passA?.value ??
    field.verification.passB?.value ??
    ''
  );
}

export function ConflictEditor({
  field,
  onConfirm,
}: {
  field: ImportFieldRecord;
  onConfirm(value: string): void;
}) {
  const [value, setValue] = useState(() => initialValue(field));

  useEffect(() => {
    setValue(initialValue(field));
  }, [field]);

  const normalized = value.trim();

  return (
    <section className="conflict-editor" aria-labelledby="confirmation-title">
      <div className="conflict-editor-heading">
        <div>
          <p className="page-eyebrow">Human review</p>
          <h2 id="confirmation-title">Confirm imported value</h2>
        </div>
      </div>

      <label className="confirmation-field">
        <span>Confirmed value</span>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={4}
          aria-label="Confirmed value"
        />
      </label>

      <button
        type="button"
        className="primary-action"
        disabled={!normalized}
        onClick={() => onConfirm(normalized)}
      >
        Confirm value
      </button>
    </section>
  );
}
