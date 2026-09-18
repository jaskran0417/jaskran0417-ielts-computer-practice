# Implementation Status

Last updated: 2026-09-18

This file is the canonical resume checkpoint for implementation work. When a chat or tool run stops unexpectedly, read this file and the latest GitHub branch/CI state before continuing.

## Production baseline

- Production branch: `main`
- Hosting: GitHub Pages fallback + Netlify when available.
- GitHub Pages deployment workflow builds and publishes the Vite app from `main`.
- GitHub Pages URL: `https://jaskran0417.github.io/jaskran0417-ielts-computer-practice/`.
- Reading real-PDF regression fixes are merged into `main`.

## Completed and live

### Foundation / shared

- React + TypeScript + Vite application shell.
- Central exam state/reducer with persisted timing.
- IndexedDB attempt persistence.
- Session configuration with selectable modules and Practice / Mock mode concepts.
- Result summary UI.
- Supabase schema/migrations for foundation, protected answers, test versioning and scoring primitives.
- Netlify production deployment.

### Reading player

- Reading exam player.
- Question navigation.
- Exam timer and automatic expiry handling.
- Registry-based Reading question rendering.
- Objective Reading submission and scoring.
- Imported published tests can be selected instead of using the sample fixture.
- Persistent passage highlighting and notes are merged and restored through IndexedDB.
- Compact Reading exam presentation is merged.

### Reading import / verification

- Manual module selection.
- Multi-source import bundles.
- Same-PDF page-role assignment, including question pages and answer-key pages.
- Selectable PDF text extraction.
- Scan/image OCR foundation.
- Reading passage and question-group structuring.
- Reading question-type recognition.
- PDF-spacing normalization for real extracted text.
- Embedded table question-number recovery such as Q29/Q30 cases.
- Passage-heading false-positive protection.
- Option parsing for A-I, A-F and roman-numeral lists.
- Answer-key parsing with Extra-info note cleanup.
- Conservative accepted-answer expansion.
- TF/F/NG normalization for TFNG scoring.
- Semantic review queue.
- Inline review action beside REVIEW_REQUIRED.
- Inline recovery for question text, option lists, answer definitions and visual anchors.
- Protected answer package separated from student package.
- Local publication to IndexedDB.
- Real-shape regression coverage based on the supplied 13-page Reading PDF structure.
- Full CI green after the earlier real-PDF fixes.
- Precise PDF/image region selection is merged: selected crops are re-extracted and isolated from whole-page fields.
- Exact supplied-PDF regression hardening covers parenthetical question-range references, trailing answer-key footers, and heading-list terminators.

## Implemented foundations but not yet fully connected in production

- Supabase test catalog adapter exists.
- Supabase publication/scoring RPC/migration foundations exist.
- Local and cloud repository interfaces exist in parts of the codebase.
- The production App currently defaults to local IndexedDB publication/catalog for imported tests.

## Pending phases

### Phase A — Reading completion polish

Completed and merged:

- Persistent passage text highlighting stored in attempt state.
- Persistent notes attached to selected text or whole-passage context.
- Deterministic highlight rendering from semantic character offsets.
- Annotation restore through IndexedDB.
- Selection toolbar and notes panel in the Reading player.
- Backward-compatible restore for attempts created before annotation fields existed.
- Precise PDF/image region selection and cropped re-extraction.
- Import cleanup controls, flexible Reading scoring modes, and compact exam UI.
- Real-PDF parser hardening for duplicate range mentions and trailing answer-key footer text.

Still pending as compatibility/acceptance work:

- Final live-browser acceptance of the user's exact Reading PDF including visual diagram/table geometry.
- Windows 7 browser smoke test for the Reading path.

### Phase B — Listening

- Listening schema/module.
- Audio asset import for MP3/WAV/M4A where supported.
- Four-part Listening player.
- Audio preloading.
- Exam-mode no seek/rewind/pause.
- Practice-mode configurable pause/replay with pause count/audit.
- Volume control.
- Listening navigation.
- Configurable final review period.
- Listening answer-key mapping and protected scoring.
- Listening importer acceptance fixtures.

### Phase C — Writing

- Writing Task 1 / Task 2 schema.
- Computer-mode editor.
- Word count.
- Autosave/recovery.
- Task switching.
- 60-minute timing profile.
- Exam-mode spellcheck/autocomplete controls where practical.
- Paper-mode delivery profile.
- Optional writing-upload attachment after paper completion.
- Teacher marking workflow; no fake authoritative automatic band score.

### Phase D — Cloud institute workflow

- Supabase Auth in the application.
- Admin / Teacher / Student roles.
- Cloud test publication as the default institute workflow.
- Test ownership and published-version permissions.
- Student assignments/session codes.
- Attempt cloud synchronization.
- Teacher attempt/result views.
- RLS integration tests.
- Multi-device test access.

### Phase E — Remaining import formats / online evidence

- DOCX import adapter.
- Audio-source import adapter integration.
- Camera-scan workflow and preprocessing.
- Public URL import with SSRF/redirect/content protections.
- Optional external evidence provider.
- External evidence may support review but must never silently replace a supplied answer key.

### Phase F — Offline / PWA

- Service worker.
- App-shell caching.
- Downloadable test/media cache.
- Offline test library.
- Queued cloud synchronization.
- Storage/download management UI.

### Phase G — Portable package

- Versioned `.exam-pack` format.
- Import/export tests and media.
- Integrity/version validation.
- Local results/package handling as defined by the desktop design.

### Phase H — Windows desktop

- Shared desktop repository adapters.
- Local filesystem/media storage.
- Local database/index.
- Modern Windows Electron build.
- Windows 7 Electron 22.x compatibility build.
- `.exe` installer.
- Optional portable build if reliable.
- HTTPS/Supabase sync while online.
- Local PDF/image/audio import.
- URL import while online.
- `.exam-pack` open/import.
- Modern Windows smoke tests.
- Windows 7 real/VM smoke tests using the compatibility build.

### Phase I — Later institute/operations enhancements

- Richer teacher analytics/reports.
- Backup/export tooling.
- Production monitoring.
- Cloudflare R2 migration only when storage/media scale warrants it.

## Required implementation order

1. Finish Reading polish that affects shared exam behavior.
2. Build Listening end-to-end.
3. Build Writing end-to-end.
4. Connect Auth/roles/cloud institute workflow.
5. Add remaining import adapters and optional online evidence.
6. Add PWA/offline layer.
7. Add `.exam-pack`.
8. Package modern Windows and Windows 7 desktop applications.
9. Perform cross-platform compatibility and end-to-end acceptance.

This order keeps the desktop application on the same mature shared engine instead of freezing an incomplete web app inside Electron.

## Resume protocol

On every continuation:

1. Read this file.
2. Inspect latest `main` commit and current feature branch.
3. Check latest CI run for that branch.
4. Do not redo completed work just because a previous chat reply was interrupted.
5. Use a dedicated feature branch for each phase.
6. Update this file when a phase changes state.
7. Merge only after typecheck, full tests and production build are green.
8. Verify the active hosting target after merges that affect the web application. GitHub Pages is the no-credit fallback; verify its deployment when Pages-related files change.

## Current resume point

After the exact Reading PDF regression hardening is merged, the next implementation phase is:

**Phase B — Listening**.

Start with the Listening schema/audio asset model and player state. Keep audio time authoritative from the media element, enforce Practice/Mock policy in the player controller, and reuse the existing protected objective scoring system.