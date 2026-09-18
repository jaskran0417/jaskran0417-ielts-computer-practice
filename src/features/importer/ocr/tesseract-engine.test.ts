import { describe, expect, it, vi } from 'vitest';
import { TesseractOcrEngine, type TesseractWorkerFactory } from './tesseract-engine';

function createFactory(records: {
  createOptions: Array<Record<string, string>>;
  recognized: Blob[];
  terminated: number;
}): TesseractWorkerFactory {
  return async (_language, _oem, options) => {
    records.createOptions.push(options);
    return {
      async recognize(image: Blob) {
        records.recognized.push(image);
        return { data: { text: 'library', confidence: 93 } };
      },
      async terminate() {
        records.terminated += 1;
      },
    };
  };
}

describe('TesseractOcrEngine', () => {
  it('uses packaged worker/core/language paths and the requested independent preprocessing pass', async () => {
    const records = { createOptions: [] as Array<Record<string, string>>, recognized: [] as Blob[], terminated: 0 };
    const preprocessed = new Blob(['processed-B'], { type: 'image/png' });
    const preprocess = vi.fn(async (_image: Blob, pass: 'A' | 'B') => {
      expect(pass).toBe('B');
      return preprocessed;
    });
    const engine = new TesseractOcrEngine(
      {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
      },
      createFactory(records),
      preprocess,
    );

    const result = await engine.recognize(new Blob(['original']), { pass: 'B' });

    expect(preprocess).toHaveBeenCalledTimes(1);
    expect(records.createOptions).toEqual([
      {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
      },
    ]);
    expect(records.recognized).toEqual([preprocessed]);
    expect(records.terminated).toBe(1);
    expect(result).toEqual({ text: 'library', confidence: 93 });
  });

  it('uses same-origin packaged OCR assets by default', async () => {
    const records = { createOptions: [] as Array<Record<string, string>>, recognized: [] as Blob[], terminated: 0 };
    const engine = new TesseractOcrEngine(
      undefined,
      createFactory(records),
      async (image) => image,
    );

    await engine.recognize(new Blob(['original']), { pass: 'A' });

    expect(records.createOptions).toHaveLength(1);
    expect(records.createOptions[0]?.workerPath).toMatch(/^\/ocr\/worker\.min\.js$/);
    expect(records.createOptions[0]?.corePath).toBe('/ocr/core');
    expect(records.createOptions[0]?.langPath).toBe('/ocr/lang');
    expect(Object.values(records.createOptions[0] ?? {})).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^https?:\/\//i)]),
    );
  });

  it('terminates the worker even when recognition fails', async () => {
    let terminated = 0;
    const factory: TesseractWorkerFactory = async () => ({
      async recognize() {
        throw new Error('OCR failed');
      },
      async terminate() {
        terminated += 1;
      },
    });
    const engine = new TesseractOcrEngine(
      { workerPath: '/worker.js', corePath: '/core', langPath: '/lang' },
      factory,
      async (image) => image,
    );

    await expect(engine.recognize(new Blob(['x']), { pass: 'A' })).rejects.toThrow('OCR failed');
    expect(terminated).toBe(1);
  });
});
