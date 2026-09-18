import { useState } from 'react';
import type { NormalizedRect, VerificationState } from '../domain';

interface ConfirmedVisualRegion {
  crop: NormalizedRect;
  verificationState: Extract<VerificationState, 'CONFIRMED'>;
}

interface VisualRegionEditorProps {
  pageImageUrl: string;
  pageNumber: number;
  initialCrop: NormalizedRect | null;
  onConfirm(value: ConfirmedVisualRegion): void;
}

function validCrop(crop: NormalizedRect): boolean {
  return (
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    Number.isFinite(crop.width) &&
    Number.isFinite(crop.height) &&
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.width > 0 &&
    crop.height > 0 &&
    crop.x + crop.width <= 1 &&
    crop.y + crop.height <= 1
  );
}

export function VisualRegionEditor({
  pageImageUrl,
  pageNumber,
  initialCrop,
  onConfirm,
}: VisualRegionEditorProps) {
  const [crop, setCrop] = useState<NormalizedRect>(
    initialCrop ?? { x: 0, y: 0, width: 1, height: 1 },
  );

  function update(key: keyof NormalizedRect, raw: string) {
    const value = Number(raw);
    setCrop((current) => ({ ...current, [key]: value }));
  }

  const isValid = validCrop(crop);

  return (
    <section className="visual-region-editor" aria-labelledby="visual-region-title">
      <div className="import-panel-heading">
        <div>
          <p className="page-eyebrow">Visual evidence</p>
          <h2 id="visual-region-title">Confirm source region</h2>
        </div>
        <small>Page {pageNumber}</small>
      </div>

      <div className="visual-region-preview">
        <img src={pageImageUrl} alt={`Source page ${pageNumber}`} />
      </div>

      <div className="visual-region-fields">
        {([
          ['x', 'Crop X'],
          ['y', 'Crop Y'],
          ['width', 'Crop width'],
          ['height', 'Crop height'],
        ] as const).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              aria-label={label}
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={Number.isFinite(crop[key]) ? crop[key] : ''}
              onChange={(event) => update(key, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>

      {!isValid ? (
        <div className="import-error" role="alert">
          Crop values must stay inside the normalized page bounds.
        </div>
      ) : null}

      <button
        type="button"
        className="primary-action"
        disabled={!isValid}
        onClick={() => onConfirm({ crop, verificationState: 'CONFIRMED' })}
      >
        Confirm visual region
      </button>
    </section>
  );
}
