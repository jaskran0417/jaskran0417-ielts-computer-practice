import type { TesseractAssetPaths } from './tesseract-engine';

export const REQUIRED_OFFLINE_OCR_ASSETS = [
  'ocr/worker.min.js',
  'ocr/core/tesseract-core.wasm.js',
  'ocr/core/tesseract-core-simd.wasm.js',
  'ocr/core/tesseract-core-lstm.wasm.js',
  'ocr/core/tesseract-core-simd-lstm.wasm.js',
  'ocr/lang/eng.traineddata.gz',
] as const;

function normalizeBaseUrl(baseUrl: string): string {
  const withLeadingSlash = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function resolveOfflineOcrAssetPaths(
  baseUrl = import.meta.env.BASE_URL,
): TesseractAssetPaths {
  const base = normalizeBaseUrl(baseUrl);
  return {
    workerPath: `${base}ocr/worker.min.js`,
    corePath: `${base}ocr/core`,
    langPath: `${base}ocr/lang`,
  };
}
