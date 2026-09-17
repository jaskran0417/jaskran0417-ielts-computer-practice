import { describe, expect, it } from 'vitest';
import { preprocessPixels, type PixelImage } from './image-preprocess';

function image(): PixelImage {
  return {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      10, 20, 30, 255,
      220, 230, 240, 255,
    ]),
  };
}

describe('preprocessPixels', () => {
  it('pass A converts RGB input to deterministic grayscale while preserving alpha', () => {
    const result = preprocessPixels(image(), 'A');

    expect(Array.from(result.data)).toEqual([
      18, 18, 18, 255,
      228, 228, 228, 255,
    ]);
  });

  it('pass B creates an independent high-contrast binary representation', () => {
    const result = preprocessPixels(image(), 'B');

    expect(Array.from(result.data)).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
  });

  it('never mutates the input pixel buffer', () => {
    const input = image();
    const original = Array.from(input.data);

    preprocessPixels(input, 'A');

    expect(Array.from(input.data)).toEqual(original);
  });
});
