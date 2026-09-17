import { describe, expect, it } from 'vitest';
import { resolveOfflineOcrAssetPaths } from './ocr/offline-assets';

describe('offline importer assets', () => {
  it('resolves worker, core and language data under the application base path', () => {
    expect(resolveOfflineOcrAssetPaths('/')).toEqual({
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
    });

    expect(resolveOfflineOcrAssetPaths('/ielts-computer-practice/')).toEqual({
      workerPath: '/ielts-computer-practice/ocr/worker.min.js',
      corePath: '/ielts-computer-practice/ocr/core',
      langPath: '/ielts-computer-practice/ocr/lang',
    });
  });

  it('never resolves OCR dependencies to a remote CDN', () => {
    const paths = resolveOfflineOcrAssetPaths('/preview');

    for (const value of Object.values(paths)) {
      expect(value).not.toMatch(/^https?:\/\//i);
      expect(value).toMatch(/^\/preview\/ocr\//);
    }
  });
});
