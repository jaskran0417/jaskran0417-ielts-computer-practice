import type { NormalizedQuestionRect } from '../test-schema/types';

/** Find substantial connected artwork enclosing every confirmed answer centre.
 * Text-only pages and disconnected/ambiguous artwork return null. Original
 * imagery stays available through the full-image control.
 */
export function visualContentCrop(data: Uint8ClampedArray, width: number, height: number,
  anchors: NormalizedQuestionRect[]): NormalizedQuestionRect | null {
  if (!anchors.length || width < 1 || height < 1) return null;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const offset = i * 4;
    if (data[offset + 3] > 30 && Math.min(data[offset], data[offset + 1], data[offset + 2]) < 220) mask[i] = 1;
  }
  const queue = new Int32Array(mask.length);
  let best: NormalizedQuestionRect | null = null;
  let bestArea = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let head = 0, tail = 1;
    queue[0] = start; mask[start] = 0;
    let left = start % width, right = left, top = Math.floor(start / width), bottom = top;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (mask[next]) { mask[next] = 0; queue[tail++] = next; }
      }
    }
    const x = left / width, y = top / height;
    const w = (right - left + 1) / width, h = (bottom - top + 1) / height;
    const area = w * h;
    if (area < .04 || area > .95 || area <= bestArea) continue;
    if (!anchors.every(anchor => anchor.x + anchor.width / 2 >= x && anchor.x + anchor.width / 2 <= x + w
      && anchor.y + anchor.height / 2 >= y && anchor.y + anchor.height / 2 <= y + h)) continue;
    const cropLeft = Math.max(0, Math.min(x, ...anchors.map(anchor => anchor.x)) - .015);
    const cropTop = Math.max(0, Math.min(y, ...anchors.map(anchor => anchor.y)) - .015);
    const cropRight = Math.min(1, Math.max(x + w, ...anchors.map(anchor => anchor.x + anchor.width)) + .015);
    const cropBottom = Math.min(1, Math.max(y + h, ...anchors.map(anchor => anchor.y + anchor.height)) + .015);
    best = { x: cropLeft, y: cropTop, width: cropRight - cropLeft, height: cropBottom - cropTop };
    bestArea = area;
  }
  return best;
}

export function imageContentCrop(image: HTMLImageElement, anchors: NormalizedQuestionRect[]) {
  try {
    const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return visualContentCrop(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, anchors);
  } catch { return null; } // CORS-restricted images retain the conservative crop.
}
