import { describe, expect, it } from 'vitest';
import { anchorWithinCrop, visualPresentationCrop } from './visual-layout';

describe('visual presentation layout', () => {
  it('crops a full PDF page around a diagram anchor cluster while keeping context', () => {
    const anchors = [
      { x: 0.66, y: 0.34, width: 0.18, height: 0.07 },
      { x: 0.65, y: 0.46, width: 0.18, height: 0.07 },
      { x: 0.67, y: 0.59, width: 0.18, height: 0.07 },
      { x: 0.66, y: 0.66, width: 0.18, height: 0.07 },
    ];

    const crop = visualPresentationCrop(anchors, 'DIAGRAM');

    expect(crop.y).toBeGreaterThan(0.1);
    expect(crop.y + crop.height).toBeLessThan(0.95);
    expect(crop.width).toBeGreaterThanOrEqual(0.72);
    for (const anchor of anchors) {
      expect(anchor.x).toBeGreaterThanOrEqual(crop.x);
      expect(anchor.y).toBeGreaterThanOrEqual(crop.y);
      expect(anchor.x + anchor.width).toBeLessThanOrEqual(crop.x + crop.width);
      expect(anchor.y + anchor.height).toBeLessThanOrEqual(crop.y + crop.height);
    }
  });

  it('transforms stored page coordinates into the cropped student viewport', () => {
    const crop = { x: 0.1, y: 0.2, width: 0.8, height: 0.5 };
    const transformed = anchorWithinCrop(
      { x: 0.5, y: 0.4, width: 0.2, height: 0.05 },
      crop,
    );

    expect(transformed).toEqual({
      x: 0.5,
      y: 0.4,
      width: 0.25,
      height: 0.1,
    });
  });
});
