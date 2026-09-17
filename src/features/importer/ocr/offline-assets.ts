import type { TesseractAssetPaths } from './tesseract-engine';

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
