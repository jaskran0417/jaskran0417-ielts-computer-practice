import { expect, it } from 'vitest';
import { visualContentCrop } from './visual-content-crop';

it('finds a connected diagram surrounding all answer positions without page headers', () => {
  const data = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  for (let y = 20; y < 80; y++) for (let x = 10; x < 90; x++) {
    const i = (y * 100 + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0;
  }
  const crop = visualContentCrop(data, 100, 100, [{ x: .6, y: .3, width: .15, height: .04 }]);
  expect(crop).not.toBeNull();
  expect(crop!.x).toBeLessThan(.1);
  expect(crop!.y).toBeGreaterThan(.15);
  expect(crop!.y + crop!.height).toBeLessThan(.85);
});

it('does not cut to artwork which excludes a confirmed answer position', () => {
  const data = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  for (let y = 20; y < 80; y++) for (let x = 10; x < 50; x++) {
    const i = (y * 100 + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0;
  }
  expect(visualContentCrop(data, 100, 100, [{ x: .8, y: .3, width: .15, height: .04 }])).toBeNull();
});
