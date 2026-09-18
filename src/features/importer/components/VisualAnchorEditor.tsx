import { useState, type MouseEvent } from 'react';
import type { NormalizedRect } from '../domain';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function VisualAnchorEditor({
  questionNumber,
  imageUrl,
  initialAnchor,
  onConfirm,
}: {
  questionNumber: number;
  imageUrl: string;
  initialAnchor?: NormalizedRect;
  onConfirm(anchor: NormalizedRect): void;
}) {
  const [anchor, setAnchor] = useState<NormalizedRect | null>(initialAnchor ?? null);
  const [boxWidth, setBoxWidth] = useState(initialAnchor?.width ?? 0.22);
  const [boxHeight, setBoxHeight] = useState(initialAnchor?.height ?? 0.07);

  function place(event: MouseEvent<HTMLImageElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const centerX = (event.clientX - bounds.left) / bounds.width;
    const centerY = (event.clientY - bounds.top) / bounds.height;
    setAnchor({
      x: clamp(centerX - boxWidth / 2, 0, 1 - boxWidth),
      y: clamp(centerY - boxHeight / 2, 0, 1 - boxHeight),
      width: boxWidth,
      height: boxHeight,
    });
  }

  function resize(width: number, height: number) {
    setBoxWidth(width);
    setBoxHeight(height);
    setAnchor((current) =>
      current
        ? {
            x: clamp(current.x, 0, 1 - width),
            y: clamp(current.y, 0, 1 - height),
            width,
            height,
          }
        : current,
    );
  }

  return (
    <div className="visual-anchor-editor">
      <p>Tap the source image where the answer box for Question {questionNumber} belongs.</p>
      <div className="visual-anchor-stage">
        <img
          src={imageUrl}
          alt={`Source visual for question ${questionNumber}`}
          onClick={place}
        />
        {anchor ? (
          <span
            className="visual-anchor-preview"
            aria-label={`Question ${questionNumber} answer position preview`}
            style={{
              left: `${anchor.x * 100}%`,
              top: `${anchor.y * 100}%`,
              width: `${anchor.width * 100}%`,
              height: `${anchor.height * 100}%`,
            }}
          />
        ) : null}
      </div>
      <div className="visual-anchor-size">
        <label>
          Box width
          <input
            aria-label="Answer box width"
            type="range"
            min="10"
            max="50"
            value={Math.round(boxWidth * 100)}
            onChange={(event) => resize(Number(event.currentTarget.value) / 100, boxHeight)}
          />
        </label>
        <label>
          Box height
          <input
            aria-label="Answer box height"
            type="range"
            min="4"
            max="20"
            value={Math.round(boxHeight * 100)}
            onChange={(event) => resize(boxWidth, Number(event.currentTarget.value) / 100)}
          />
        </label>
      </div>
      <button
        type="button"
        className="primary-action"
        disabled={!anchor}
        onClick={() => anchor && onConfirm(anchor)}
      >
        Confirm answer position
      </button>
    </div>
  );
}
