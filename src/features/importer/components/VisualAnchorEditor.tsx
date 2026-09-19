import { useMemo, useState, type MouseEvent } from 'react';
import type { NormalizedRect } from '../domain';
import {
  anchorWithinCrop,
  visualPresentationCrop,
  type VisualPresentationKind,
} from '../../../question-types/visual-layout';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function VisualAnchorEditor({
  questionNumber,
  imageUrl,
  visualKind,
  initialAnchor,
  onConfirm,
}: {
  questionNumber: number;
  imageUrl: string;
  visualKind: VisualPresentationKind;
  initialAnchor?: NormalizedRect;
  onConfirm(anchor: NormalizedRect): void;
}) {
  const [anchor, setAnchor] = useState<NormalizedRect | null>(initialAnchor ?? null);
  const [boxWidth, setBoxWidth] = useState(initialAnchor?.width ?? 0.18);
  const [boxHeight, setBoxHeight] = useState(initialAnchor?.height ?? 0.03);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const previewCrop = useMemo(
    () => (anchor ? visualPresentationCrop([anchor], visualKind) : null),
    [anchor, visualKind],
  );
  const previewAnchor = useMemo(
    () => (anchor && previewCrop ? anchorWithinCrop(anchor, previewCrop) : null),
    [anchor, previewCrop],
  );

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

  const previewRatio =
    previewCrop && naturalRatio
      ? (naturalRatio * previewCrop.width) / previewCrop.height
      : visualKind === 'DIAGRAM'
        ? 1.3
        : 1.8;

  return (
    <div className="visual-anchor-editor">
      <p>
        Tap the source image where the answer box for Question {questionNumber} belongs.
        The full source page is only evidence; the student player crops the useful visual area.
      </p>
      <div className="visual-anchor-stage">
        <img
          src={imageUrl}
          alt={`Source visual for question ${questionNumber}`}
          onClick={place}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setNaturalRatio(image.naturalWidth / image.naturalHeight);
            }
          }}
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
            min="4"
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
            min="1"
            max="20"
            value={Math.round(boxHeight * 100)}
            onChange={(event) => resize(boxWidth, Number(event.currentTarget.value) / 100)}
          />
        </label>
      </div>

      {previewCrop && previewAnchor ? (
        <div className="visual-anchor-student-preview">
          <div>
            <strong>Student preview</strong>
            <small>This is approximately how the visual and answer box will appear in Reading.</small>
          </div>
          <div
            className="visual-anchor-student-stage"
            style={{ aspectRatio: String(previewRatio) }}
          >
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              style={{
                left: `${(-previewCrop.x / previewCrop.width) * 100}%`,
                top: `${(-previewCrop.y / previewCrop.height) * 100}%`,
                width: `${100 / previewCrop.width}%`,
              }}
            />
            <span
              className="visual-anchor-student-answer"
              style={{
                left: `${previewAnchor.x * 100}%`,
                top: `${previewAnchor.y * 100}%`,
                width: `${previewAnchor.width * 100}%`,
                minHeight: `${previewAnchor.height * 100}%`,
              }}
            >
              <b>{questionNumber}</b>
              <span>answer</span>
            </span>
          </div>
        </div>
      ) : null}

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
