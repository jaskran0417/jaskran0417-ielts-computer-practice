import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { NormalizedRect } from '../domain';
import type { SourceDocumentRecord } from '../local/import-repository';
import { renderPdfPageImage } from '../pdf/pdf-adapter';

interface Point {
  x: number;
  y: number;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function rectFromPoints(start: Point, end: Point): NormalizedRect {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function pointForEvent(event: PointerEvent<HTMLDivElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width)),
    y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height)),
  };
}

export function SourceRegionEditor({
  source,
  pageNumber,
  initialRegion,
  onConfirm,
  onCancel,
}: {
  source: SourceDocumentRecord;
  pageNumber: number;
  initialRegion?: NormalizedRect;
  onConfirm(region: NormalizedRect): void;
  onCancel(): void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [region, setRegion] = useState<NormalizedRect | null>(initialRegion ?? null);
  const [error, setError] = useState<string | null>(null);
  const dragStart = useRef<Point | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    void (async () => {
      try {
        if (!source.sourceBytes) {
          throw new Error('Original source bytes are unavailable');
        }

        const blob =
          source.kind === 'PDF'
            ? await renderPdfPageImage(source.sourceBytes.slice(0), pageNumber)
            : new Blob([source.sourceBytes.slice(0)], {
                type: source.mediaType || 'image/*',
              });

        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : 'Unable to preview this source',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, pageNumber]);

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (!previewUrl) return;
    const start = pointForEvent(event);
    dragStart.current = start;
    event.currentTarget.setPointerCapture(event.pointerId);
    setRegion({ x: start.x, y: start.y, width: 0, height: 0 });
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setRegion(rectFromPoints(dragStart.current, pointForEvent(event)));
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const next = rectFromPoints(dragStart.current, pointForEvent(event));
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setRegion(next.width >= 0.01 && next.height >= 0.01 ? next : null);
  }

  return (
    <div className="source-region-editor">
      <div className="source-region-heading">
        <div>
          <strong>Select source region</strong>
          <small>
            Drag over the exact question/answer area on page {pageNumber}.
          </small>
        </div>
        <button type="button" className="secondary-action" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error ? <div className="import-error" role="alert">{error}</div> : null}

      {previewUrl ? (
        <div
          className="source-region-stage"
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={() => {
            dragStart.current = null;
          }}
        >
          <img src={previewUrl} alt={`Source preview page ${pageNumber}`} draggable={false} />
          {region ? (
            <span
              className="source-region-selection"
              aria-label="Selected source region"
              style={{
                left: `${region.x * 100}%`,
                top: `${region.y * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            />
          ) : null}
        </div>
      ) : error ? null : (
        <p className="empty-copy">Preparing source preview…</p>
      )}

      <div className="source-region-actions">
        <button
          type="button"
          className="secondary-action"
          disabled={!region}
          onClick={() => setRegion(null)}
        >
          Reset region
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={!region || region.width < 0.01 || region.height < 0.01}
          onClick={() => region && onConfirm(region)}
        >
          Use selected region
        </button>
      </div>
    </div>
  );
}
