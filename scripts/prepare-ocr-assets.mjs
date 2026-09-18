import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const OCR_ASSETS = [
  {
    source: 'node_modules/tesseract.js/dist/worker.min.js',
    destination: 'ocr/worker.min.js',
    minBytes: 10_000,
  },
  {
    source: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
    destination: 'ocr/core/tesseract-core.wasm.js',
    minBytes: 1_000_000,
  },
  {
    source: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm.js',
    destination: 'ocr/core/tesseract-core-simd.wasm.js',
    minBytes: 1_000_000,
  },
  {
    source: 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
    destination: 'ocr/core/tesseract-core-lstm.wasm.js',
    minBytes: 1_000_000,
  },
  {
    source: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
    destination: 'ocr/core/tesseract-core-simd-lstm.wasm.js',
    minBytes: 1_000_000,
  },
  {
    source: 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
    destination: 'ocr/lang/eng.traineddata.gz',
    minBytes: 1_000_000,
  },
];

async function assertHealthyFile(path, minBytes, label) {
  let details;
  try {
    details = await stat(path);
  } catch {
    throw new Error(`Missing required OCR asset: ${label} (${path})`);
  }

  if (!details.isFile()) {
    throw new Error(`OCR asset is not a file: ${label} (${path})`);
  }

  if (details.size < minBytes) {
    throw new Error(
      `OCR asset looks incomplete: ${label} is ${details.size} bytes; expected at least ${minBytes}`,
    );
  }
}

async function verifyAssets(rootDirectory) {
  for (const asset of OCR_ASSETS) {
    await assertHealthyFile(
      join(rootDirectory, asset.destination),
      asset.minBytes,
      asset.destination,
    );
  }
}

async function preparePublicAssets() {
  const publicRoot = join(repositoryRoot, 'public');
  const generatedOcrRoot = join(publicRoot, 'ocr');

  await rm(generatedOcrRoot, { recursive: true, force: true });

  for (const asset of OCR_ASSETS) {
    const sourcePath = join(repositoryRoot, asset.source);
    const destinationPath = join(publicRoot, asset.destination);

    await assertHealthyFile(sourcePath, asset.minBytes, asset.source);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }

  await verifyAssets(publicRoot);
  console.log(`Prepared ${OCR_ASSETS.length} local OCR assets in public/ocr.`);
}

if (process.argv.includes('--verify-dist')) {
  await verifyAssets(join(repositoryRoot, 'dist'));
  console.log(`Verified ${OCR_ASSETS.length} local OCR assets in dist/ocr.`);
} else {
  await preparePublicAssets();
}
