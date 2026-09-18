import type { NormalizedQuestionRect } from '../test-schema/types';

export type VisualPresentationKind = 'DIAGRAM' | 'TABLE';

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function expandToMinimum(
  start: number,
  end: number,
  minimumSize: number,
): [number, number] {
  const size = end - start;
  if (size >= minimumSize) return [start, end];

  const missing = minimumSize - size;
  let nextStart = start - missing / 2;
  let nextEnd = end + missing / 2;

  if (nextStart < 0) {
    nextEnd = Math.min(1, nextEnd - nextStart);
    nextStart = 0;
  }
  if (nextEnd > 1) {
    nextStart = Math.max(0, nextStart - (nextEnd - 1));
    nextEnd = 1;
  }

  return [nextStart, nextEnd];
}

/**
 * Creates a presentation viewport around confirmed answer anchors.
 *
 * Imported PDFs may retain a full source page for evidence. The student player
 * should show the useful diagram/table area rather than the entire A4 page.
 * The crop is intentionally generous: it never tries to infer protocol meaning,
 * it only removes distant page furniture while keeping context around the
 * confirmed answer positions.
 */
export function visualPresentationCrop(
  anchors: NormalizedQuestionRect[],
  kind: VisualPresentationKind,
): NormalizedQuestionRect {
  if (anchors.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const left = Math.min(...anchors.map((anchor) => anchor.x));
  const top = Math.min(...anchors.map((anchor) => anchor.y));
  const right = Math.max(...anchors.map((anchor) => anchor.x + anchor.width));
  const bottom = Math.max(...anchors.map((anchor) => anchor.y + anchor.height));

  const margins =
    kind === 'DIAGRAM'
      ? { left: 0.58, right: 0.12, top: 0.19, bottom: 0.17 }
      : { left: 0.2, right: 0.2, top: 0.18, bottom: 0.18 };

  let cropLeft = clamp(left - margins.left);
  let cropTop = clamp(top - margins.top);
  let cropRight = clamp(right + margins.right);
  let cropBottom = clamp(bottom + margins.bottom);

  [cropLeft, cropRight] = expandToMinimum(
    cropLeft,
    cropRight,
    kind === 'DIAGRAM' ? 0.72 : 0.68,
  );
  [cropTop, cropBottom] = expandToMinimum(
    cropTop,
    cropBottom,
    kind === 'DIAGRAM' ? 0.46 : 0.38,
  );

  return {
    x: cropLeft,
    y: cropTop,
    width: Math.max(0.01, cropRight - cropLeft),
    height: Math.max(0.01, cropBottom - cropTop),
  };
}

export function anchorWithinCrop(
  anchor: NormalizedQuestionRect,
  crop: NormalizedQuestionRect,
): NormalizedQuestionRect {
  return {
    x: clamp((anchor.x - crop.x) / crop.width),
    y: clamp((anchor.y - crop.y) / crop.height),
    width: clamp(anchor.width / crop.width, 0.03, 1),
    height: clamp(anchor.height / crop.height, 0.03, 1),
  };
}
