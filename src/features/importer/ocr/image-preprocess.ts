export type OcrPreprocessPass = 'A' | 'B';

export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function grayscale(red: number, green: number, blue: number): number {
  return Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
}

export function preprocessPixels(input: PixelImage, pass: OcrPreprocessPass): PixelImage {
  if (input.data.length !== input.width * input.height * 4) {
    throw new Error('Pixel buffer length does not match image dimensions');
  }

  const output = new Uint8ClampedArray(input.data.length);

  for (let index = 0; index < input.data.length; index += 4) {
    const grey = grayscale(input.data[index], input.data[index + 1], input.data[index + 2]);
    const value = pass === 'A' ? grey : grey >= 128 ? 255 : 0;

    output[index] = value;
    output[index + 1] = value;
    output[index + 2] = value;
    output[index + 3] = input.data[index + 3];
  }

  return {
    width: input.width,
    height: input.height,
    data: output,
  };
}
