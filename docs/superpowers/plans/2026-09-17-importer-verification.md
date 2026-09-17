# Importer + Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reliable document-ingestion pipeline that converts local PDFs/images and answer keys into evidence-backed draft test content, performs independent verification passes, blocks publication on unresolved critical conflicts, and works without internet once dependencies/assets are available locally.

**Architecture:** Import logic is pure TypeScript behind source adapters. Digital PDF extraction uses the PDF.js display layer only; OCR is isolated behind an `OcrEngine` interface. Every extracted field carries source provenance and independent-pass evidence. The admin UI consumes normalized import records rather than PDF/OCR implementation details. Supabase stores durable metadata/evidence when online, while local browser storage keeps in-progress imports usable offline.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 5, IndexedDB/idb, Supabase, PDF.js `pdfjs-dist@4.10.38` legacy display layer, Tesseract.js `6.0.1` behind an adapter, Canvas APIs for preprocessing.

**Spec:** `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md` and `docs/superpowers/specs/2026-09-17-offline-desktop-delivery-design.md`

## Global Constraints

- Windows 7 application-level feature parity is required; primary browser target Firefox ESR 115, secondary Chrome 109 / Edge 109.
- Internet must not be required for importing a local PDF/image or reviewing already-local evidence.
- The Test Player must never depend on PDF/OCR/import implementation details.
- Never silently invent unreadable text.
- Critical instruction/answer conflicts must block publication.
- Every extracted critical field must preserve source document/page/region evidence.
- Student-safe test payloads must never contain protected answer definitions.
- Current PDF.js 6.x legacy support is too new for Chrome 109; pin `pdfjs-dist@4.10.38` and use its legacy display layer only. Do not embed the generic PDF.js viewer UI/CSS.
- OCR runs behind an interface so engine/version changes do not change domain types.
- TDD is required for production behavior.

---

## File map

- `src/features/importer/domain.ts` — source/import/extraction domain types.
- `src/features/importer/verification.ts` — deterministic verification comparison rules.
- `src/features/importer/verification.test.ts` — verification unit tests.
- `src/features/importer/source-classifier.ts` — PDF page classification by extracted-text evidence.
- `src/features/importer/source-classifier.test.ts` — classification tests.
- `src/features/importer/pdf/pdf-adapter.ts` — PDF.js legacy adapter.
- `src/features/importer/pdf/pdf-adapter.test.ts` — PDF adapter contract tests.
- `src/features/importer/ocr/ocr-engine.ts` — OCR interface.
- `src/features/importer/ocr/tesseract-engine.ts` — Tesseract adapter.
- `src/features/importer/ocr/image-preprocess.ts` — deterministic Canvas preprocessing variants.
- `src/features/importer/answer-key/parse-answer-key.ts` — independent answer-key parsers.
- `src/features/importer/answer-key/parse-answer-key.test.ts` — parser disagreement tests.
- `src/features/importer/local/import-repository.ts` — local draft/evidence persistence contract.
- `src/features/importer/local/indexeddb-import-repository.ts` — IndexedDB implementation.
- `src/features/importer/local/indexeddb-import-repository.test.ts` — repository contract tests.
- `src/features/importer/ImportWorkspace.tsx` — admin importer/review UI.
- `src/features/importer/ImportWorkspace.test.tsx` — workflow tests.
- `src/features/importer/components/SourceEvidencePane.tsx` — source page/crop evidence view.
- `src/features/importer/components/VerificationBadge.tsx` — status presentation.
- `src/features/importer/components/ConflictEditor.tsx` — explicit human confirmation UI.
- `src/test-schema/import-mapper.ts` — maps confirmed import records into student-safe schema.
- `src/test-schema/import-mapper.test.ts` — ensures protected answers are excluded.
- `supabase/migrations/20260917230000_import_verification.sql` — durable import/evidence schema + RLS.
- `supabase/migrations/20260917230100_publication_guard.sql` — database publication guard.

---

### Task 1: Import and verification domain

**Files:**
- Create: `src/features/importer/domain.ts`
- Create: `src/features/importer/verification.test.ts`
- Create: `src/features/importer/verification.ts`

**Interfaces:**

```ts
export type VerificationState =
  | 'VERIFIED'
  | 'CONFIRMED'
  | 'REVIEW_REQUIRED'
  | 'UNREADABLE';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceEvidence {
  documentId: string;
  pageNumber: number;
  region?: NormalizedRect;
  method: 'PDF_TEXT' | 'OCR_A' | 'OCR_B' | 'MANUAL';
}

export interface ExtractionPass {
  value: string;
  confidence: number | null;
  evidence: SourceEvidence;
}

export interface VerificationResult {
  state: VerificationState;
  normalizedValue: string | null;
  reasons: string[];
  passA?: ExtractionPass;
  passB?: ExtractionPass;
}
```

- [ ] **Step 1: Write failing verification tests**

Cover:

```ts
it('verifies independently extracted text when normalized values agree', ...)
it('requires review when critical text differs', ...)
it('returns unreadable when both passes are blank', ...)
it('does not treat TWO WORDS and THREE WORDS as equivalent', ...)
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/verification.test.ts --run
```

- [ ] **Step 3: Implement deterministic normalization and comparison**

Normalization may collapse whitespace and normalize Unicode punctuation, but must not remove or rewrite semantic words/numbers.

```ts
export function normalizeExtractedText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}
```

Critical exact fields use exact normalized equality. No AI similarity scoring is allowed to auto-verify a disagreement.

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/domain.ts src/features/importer/verification*
git commit -m "feat: add evidence-backed verification domain"
```

### Task 2: PDF page classification and extraction adapter

**Files:**
- Modify: `package.json`
- Create: `src/features/importer/source-classifier.test.ts`
- Create: `src/features/importer/source-classifier.ts`
- Create: `src/features/importer/pdf/pdf-adapter.ts`
- Create: `src/features/importer/pdf/pdf-adapter.test.ts`

**Interfaces:**

```ts
export interface ExtractedTextItem {
  text: string;
  pageNumber: number;
  rect: NormalizedRect;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  width: number;
  height: number;
  items: ExtractedTextItem[];
}

export type PdfPageKind = 'DIGITAL_TEXT' | 'LIKELY_SCAN' | 'MIXED';
```

- [ ] **Step 1: Add `pdfjs-dist@4.10.38`**

Use `pdfjs-dist/legacy/build/pdf.mjs` and the matching worker. Do not import viewer CSS/components.

- [ ] **Step 2: Write classifier RED tests**

Rules use measurable evidence, not filenames:

- no useful text items => `LIKELY_SCAN`;
- substantial selectable text => `DIGITAL_TEXT`;
- sparse text plus page imagery/text fragments => `MIXED`.

- [ ] **Step 3: Implement classifier**

Keep thresholds exported/configurable for tests.

- [ ] **Step 4: Write PDF adapter contract test**

Use a tiny checked-in fixture PDF with selectable text. Assert exact page count, non-empty text, page number, and normalized geometry bounds `0..1`.

- [ ] **Step 5: Implement PDF adapter**

`extractPdf(arrayBuffer)` returns page text items and geometry only. It must not perform OCR itself.

- [ ] **Step 6: Verify typecheck/tests/build**

```bash
npm run typecheck
npm test -- --run
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/features/importer tests/fixtures
git commit -m "feat: extract and classify PDF pages"
```

### Task 3: OCR abstraction and two-pass image recognition

**Files:**
- Modify: `package.json`
- Create: `src/features/importer/ocr/ocr-engine.ts`
- Create: `src/features/importer/ocr/image-preprocess.test.ts`
- Create: `src/features/importer/ocr/image-preprocess.ts`
- Create: `src/features/importer/ocr/tesseract-engine.ts`
- Create: `src/features/importer/ocr/two-pass-ocr.test.ts`
- Create: `src/features/importer/ocr/two-pass-ocr.ts`

**Interfaces:**

```ts
export interface OcrResult {
  text: string;
  confidence: number | null;
}

export interface OcrEngine {
  recognize(image: Blob, options: { pass: 'A' | 'B' }): Promise<OcrResult>;
}
```

- [ ] **Step 1: Add `tesseract.js@6.0.1`**

Pin the version; do not silently float to v7 until Windows 7 browser smoke tests approve it.

- [ ] **Step 2: Write preprocessing tests**

Pass A = conservative grayscale/contrast normalization.
Pass B = independent threshold/sharpen path.

Tests operate on a tiny synthetic canvas/image fixture and assert deterministic pixel output.

- [ ] **Step 3: Implement preprocessing**

No network calls. Canvas APIs only.

- [ ] **Step 4: Write two-pass orchestration RED test**

Use a fake `OcrEngine` returning different pass values and assert `REVIEW_REQUIRED` on disagreement.

- [ ] **Step 5: Implement two-pass OCR orchestration**

Pass A and B must both retain their own `SourceEvidence` and confidence.

- [ ] **Step 6: Implement Tesseract adapter**

Language data/core paths must be configurable so the PWA/desktop package can host them locally for offline use.

- [ ] **Step 7: Verify and commit**

### Task 4: Answer-key parser with independent strategies

**Files:**
- Create: `src/features/importer/answer-key/parse-answer-key.test.ts`
- Create: `src/features/importer/answer-key/parse-answer-key.ts`

**Interfaces:**

```ts
export interface ParsedAnswer {
  questionNumber: number;
  answer: string;
}

export interface AnswerKeyParseResult {
  answers: ParsedAnswer[];
  verification: VerificationResult[];
}
```

- [ ] **Step 1: Write RED tests**

Support at least:

```text
1. library
2 B
3 TRUE
```

and compact forms such as:

```text
1 library  2 B  3 TRUE
```

Independent strategies must disagree visibly rather than picking one silently.

- [ ] **Step 2: Implement parser A**

Strict line-oriented parser.

- [ ] **Step 3: Implement parser B**

Question-number token scanner independent of line boundaries.

- [ ] **Step 4: Merge by question number through verification engine**

- [ ] **Step 5: Verify and commit**

### Task 5: Local-first import repository

**Files:**
- Create: `src/features/importer/local/import-repository.ts`
- Create: `src/features/importer/local/indexeddb-import-repository.test.ts`
- Create: `src/features/importer/local/indexeddb-import-repository.ts`

**Interfaces:**

```ts
export interface ImportDraft {
  id: string;
  testId: string;
  sourceDocuments: SourceDocumentRecord[];
  fields: ImportFieldRecord[];
  updatedAtMs: number;
}

export interface ImportRepository {
  loadDraft(id: string): Promise<ImportDraft | null>;
  saveDraft(draft: ImportDraft): Promise<void>;
  deleteDraft(id: string): Promise<void>;
}
```

- [ ] **Step 1: Write IndexedDB round-trip RED test**
- [ ] **Step 2: Implement repository**
- [ ] **Step 3: Prove repository works with network APIs absent**
- [ ] **Step 4: Commit**

### Task 6: Student-safe import mapping

**Files:**
- Create: `src/test-schema/import-mapper.test.ts`
- Create: `src/test-schema/import-mapper.ts`

- [ ] **Step 1: Write RED tests**

Prove:

- only `VERIFIED` or `CONFIRMED` critical fields map into publishable content;
- unresolved critical fields return a blocking error;
- supplied answer keys never appear in `StudentTestPackage` JSON.

- [ ] **Step 2: Implement mapping**
- [ ] **Step 3: Verify and commit**

### Task 7: Supabase import/evidence schema and publication guard

**Files:**
- Create: `supabase/migrations/20260917230000_import_verification.sql`
- Create: `supabase/migrations/20260917230100_publication_guard.sql`

**Tables:**

- `source_documents`
- `source_regions`
- `extraction_runs`
- `verification_records`
- `answer_definitions`

`answer_definitions` must not be selectable by students.

- [ ] **Step 1: Add schema with RLS enabled on every public table**
- [ ] **Step 2: Add staff-only mutation policies and student-safe read boundaries**
- [ ] **Step 3: Add database publication guard**

Publishing a test/version must fail when a linked critical verification record is `REVIEW_REQUIRED` or `UNREADABLE`.

- [ ] **Step 4: Apply migrations to Supabase project**
- [ ] **Step 5: Run security and performance advisors**
- [ ] **Step 6: Commit exact applied migrations**

### Task 8: Import Workspace UI

**Files:**
- Create: `src/features/importer/ImportWorkspace.test.tsx`
- Create: `src/features/importer/ImportWorkspace.tsx`
- Create: `src/features/importer/components/SourceEvidencePane.tsx`
- Create: `src/features/importer/components/VerificationBadge.tsx`
- Create: `src/features/importer/components/ConflictEditor.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/styles.css`

- [ ] **Step 1: Write workflow RED tests**

Prove a teacher can:

1. choose a local source file;
2. see extracted fields;
3. see `VERIFIED` / `REVIEW_REQUIRED` states;
4. inspect source evidence;
5. manually confirm a conflict;
6. see the field become `CONFIRMED`;
7. remain blocked while another critical conflict exists.

- [ ] **Step 2: Implement accessible file input/drop target**
- [ ] **Step 3: Implement evidence/review panes**
- [ ] **Step 4: Implement explicit manual confirmation action**
- [ ] **Step 5: Verify mobile admin layout and Windows-7-safe CSS**
- [ ] **Step 6: Run full verification and commit**

### Task 9: Offline dependency packaging and importer regression suite

**Files:**
- Modify: `vite.config.ts`
- Create: `src/features/importer/offline-assets.test.ts`
- Create: `docs/architecture/importer-compatibility.md`

- [ ] **Step 1: Ensure PDF worker/OCR worker/core/language assets are served from our own build/static assets, not required from a CDN at runtime**
- [ ] **Step 2: Add regression test that importer startup does not require configured Supabase**
- [ ] **Step 3: Document compatibility matrix**

Document at minimum:

- current Chrome/Edge/Firefox;
- Firefox ESR 115;
- Chrome/Edge 109;
- PDF.js pinned version/reason;
- OCR pinned version/reason;
- which tests still require a real Windows 7 smoke test.

- [ ] **Step 4: Run final verification**

```bash
npm run typecheck
npm test -- --run
npm run build
```

- [ ] **Step 5: Run Supabase security advisors**
- [ ] **Step 6: Open PR against `main` only after all checks are green**

---

## Acceptance criteria

The milestone is complete when:

1. a local selectable-text PDF can be opened without internet and its text/geometry extracted;
2. a scan/image can run two independent OCR passes through an isolated adapter;
3. answer keys can be parsed by two independent strategies;
4. disagreements become `REVIEW_REQUIRED`, never silently resolved;
5. critical unreadable/disputed fields block publication;
6. original page/region provenance survives into review records;
7. a human can explicitly confirm a conflict;
8. confirmed/verified content maps to the existing student-safe test schema while protected answers remain separate;
9. in-progress import state survives refresh locally;
10. Supabase RLS/security advisor stays clean;
11. the production bundle continues to target Chrome 109, Edge 109, and Firefox 115;
12. PDF/OCR runtime assets are available locally for offline operation.