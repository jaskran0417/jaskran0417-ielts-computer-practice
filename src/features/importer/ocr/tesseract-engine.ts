import type { OcrEngine, OcrResult } from './ocr-engine';
import { preprocessPixels } from './image-preprocess';

export interface TesseractAssetPaths {
  workerPath: string;
  corePath: string;
  langPath: string;
}

export interface TesseractWorkerLike {
  recognize(image: Blob): Promise<{
    data: {
      text: string;
      confidence?: number;
    };
  }>;
  terminate(): Promise<unknown>;
}

export type TesseractWorkerFactory = (
  language: string,
  oem: number,
  options: Record<string, string>,
) => Promise<TesseractWorkerLike>;

export type OcrBlobPreprocessor = (image: Blob, pass: 'A' | 'B') => Promise<Blob>;

const defaultWorkerFactory: TesseractWorkerFactory = async (language, oem, options) => {
  const module = await import('tesseract.js');
  const createWorker = module.createWorker as unknown as TesseractWorkerFactory;
  return createWorker(language, oem, options);
};

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to encode preprocessed OCR image'));
      }
    }, 'image/png');
  });
}

export const preprocessOcrBlob: OcrBlobPreprocessor = async (image, pass) => {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    throw new Error('Browser image preprocessing APIs are unavailable');
  }

  const bitmap = await createImageBitmap(image);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Unable to create image preprocessing canvas');
    }

    context.drawImage(bitmap, 0, 0);
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const processed = preprocessPixels(
      { width: source.width, height: source.height, data: source.data },
      pass,
    );
    const browserImageData = context.createImageData(processed.width, processed.height);
    browserImageData.data.set(processed.data);
    context.putImageData(browserImageData, 0, 0);
    return canvasToBlob(canvas);
  } finally {
    bitmap.close();
  }
};

export class TesseractOcrEngine implements OcrEngine {
  constructor(
    private readonly paths: TesseractAssetPaths,
    private readonly workerFactory: TesseractWorkerFactory = defaultWorkerFactory,
    private readonly preprocess: OcrBlobPreprocessor = preprocessOcrBlob,
  ) {}

  async recognize(image: Blob, options: { pass: 'A' | 'B' }): Promise<OcrResult> {
    const preparedImage = await this.preprocess(image, options.pass);
    const worker = await this.workerFactory('eng', 1, {
      workerPath: this.paths.workerPath,
      corePath: this.paths.corePath,
      langPath: this.paths.langPath,
    });

    try {
      const result = await worker.recognize(preparedImage);
      return {
        text: result.data.text,
        confidence:
          typeof result.data.confidence === 'number' ? result.data.confidence : null,
      };
    } finally {
      await worker.terminate();
    }
  }
}
