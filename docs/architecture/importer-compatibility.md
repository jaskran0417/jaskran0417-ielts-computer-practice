# Importer Compatibility and Offline Runtime

This document records the compatibility floor and offline-runtime assumptions for the local importer.

## Supported browser/runtime targets

| Runtime | Status | Notes |
| --- | --- | --- |
| Current Chrome | Supported | Primary modern-browser target. |
| Current Edge | Supported | Primary modern-browser target. |
| Current Firefox | Supported | Primary modern-browser target. |
| Firefox ESR 115 | Required compatibility floor | Primary Windows 7 browser target. Importer code, OCR orchestration, IndexedDB persistence, and app UI must remain compatible. |
| Chrome 109 | Best-effort compatibility floor | Last Chrome release line available on Windows 7. Production Vite output explicitly targets Chrome 109. |
| Edge 109 | Best-effort compatibility floor | Last Edge release line available on Windows 7. Production Vite output explicitly targets Edge 109. |

The Vite production build targets:

```ts
['chrome109', 'edge109', 'firefox115']
```

Application-level features are not intentionally reduced on Windows 7.

## PDF runtime

- Package: `pdfjs-dist`
- Pinned version: `4.10.38`
- Entry point: legacy display layer
- Generic PDF.js viewer UI/CSS is not used.
- The matching PDF.js worker is bundled by Vite and resolved locally at runtime.
- Selectable-text PDF pages use PDF text extraction.
- Scan-only pages are rendered locally and passed through two independent OCR passes.
- Mixed pages remain evidence-backed and require independent review rather than being silently trusted.

### Why the PDF.js version is pinned

The importer must remain compatible with the project's Windows 7 browser floor. Newer PDF.js releases move their browser/runtime requirements forward, so upgrades must not be taken automatically. Any PDF.js upgrade requires browser-floor regression tests before the pin is changed.

## OCR runtime

- Package: `tesseract.js@6.0.1`
- Core package: `tesseract.js-core@6.0.0`
- English data: `@tesseract.js-data/eng@1.0.0`
- Worker, WASM/core variants, and English trained data are copied into the application build.
- Runtime paths are same-origin under the application base path.
- The importer does not require a CDN for OCR after the application assets are installed/cached locally.
- The build fails when required OCR runtime assets are missing or look incomplete.

Required packaged assets:

```text
ocr/worker.min.js
ocr/core/tesseract-core.wasm.js
ocr/core/tesseract-core-simd.wasm.js
ocr/core/tesseract-core-lstm.wasm.js
ocr/core/tesseract-core-simd-lstm.wasm.js
ocr/lang/eng.traineddata.gz
```

### Why Tesseract is pinned

OCR behavior and browser/runtime assumptions are part of the importer's compatibility contract. The Tesseract major version must not float silently. Upgrading it requires importer regression tests and Windows 7 compatibility validation.

## Offline behavior

Once application/runtime assets are present locally, these importer paths are designed to work without Supabase or external network access:

- local selectable-text PDF extraction;
- local scan-only PDF rendering;
- local image OCR;
- two-pass OCR verification;
- TXT/CSV/JSON answer-key parsing;
- import review and explicit confirmation;
- IndexedDB draft persistence and restore;
- publication-blocking decisions performed in the local domain layer.

Tests explicitly verify that the default local importer can start and process a local answer-key file without Supabase configuration, and that selectable-PDF processing does not call `fetch`.

Cloud synchronization, remote publishing, and optional web verification remain online features and are outside this local-import guarantee.

## Verification and safety boundaries

- Unreadable content is never silently invented.
- Independent extraction disagreements become `REVIEW_REQUIRED`.
- Critical unresolved content blocks publication.
- Human confirmation is recorded explicitly as `CONFIRMED`.
- Protected answer definitions remain outside ordinary student-safe payloads.
- Imported source evidence preserves document/page information; OCR evidence also retains the recognition pass.

## Physical Windows 7 smoke test still required

Automated CI proves TypeScript compatibility, unit/integration behavior, and the configured browser build target. It cannot prove the real Windows 7 graphics/browser environment.

Before declaring Windows 7 importer compatibility fully validated, perform a physical or VM smoke test on Windows 7 using Firefox ESR 115, and where practical Chrome 109 / Edge 109, covering:

1. application startup;
2. Import workspace navigation;
3. selectable-text PDF import;
4. scan-only PDF rendering and OCR;
5. PNG/JPEG OCR;
6. English OCR asset loading with internet disconnected;
7. IndexedDB draft save, refresh, and restore;
8. manual conflict confirmation;
9. blocked publication while a critical conflict remains;
10. a production build served from the same path layout expected by the desktop wrapper.

A failed Windows 7 smoke test is a release blocker for claiming Windows 7 importer support, but it does not justify removing application-level features from the Windows 7 edition.
