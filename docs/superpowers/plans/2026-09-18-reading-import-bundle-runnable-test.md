# Reading Import Bundle → Runnable Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert manually selected Reading source bundles into verified, publishable, runnable tests with protected answer definitions, then launch and score the published imported test instead of the hard-coded sample fixture.

**Architecture:** Extend the existing importer from single-file extraction into a multi-source `ImportBundle` with explicit source/page roles. Add deterministic Reading structure recognizers that produce a typed intermediate draft, expand the Universal Test Schema and renderer registry for the required Reading question types, map supplied answer-key material into protected answer definitions, then publish atomically to Supabase and load immutable published versions through a test catalog into SessionBuilder/ReadingExam.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 5, IndexedDB/idb, Supabase PostgreSQL/Auth/RLS/RPC, existing PDF.js `4.10.38` legacy adapter, existing Tesseract.js `6.0.1` OCR pipeline.

**Spec:** `docs/superpowers/specs/2026-09-18-import-bundle-runnable-test-converter-design.md`

## Global Constraints

- Module is selected by the administrator; do not add automatic Reading/Listening/Writing detection.
- Import unit is a bundle, not one file.
- The same PDF may contain question pages and answer-key pages.
- Supplied answer key outranks web evidence.
- Student packages must never contain protected answer definitions.
- Uncertain critical structure always enters review; never silently guess.
- Published test versions are immutable.
- Production session launch must load the selected published test/version, never `sampleReadingTest`.
- Core local conversion must continue to work without internet.
- Windows 7 browser floor remains Firefox ESR 115; Chrome/Edge 109 are best-effort compatibility targets.
- PDF.js remains pinned to `4.10.38`; Tesseract.js remains pinned to `6.0.1`.
- TDD is required for every production behavior change.
- Do not merge implementation work directly to `main`; execute on a dedicated feature branch/worktree and use PR verification.

---

## File Map

### Import bundle and persistence

- Create: `src/features/importer/bundle/domain.ts` — ImportBundle, source assignments, page-role ranges, status.
- Create: `src/features/importer/bundle/import-bundle.test.ts` — domain validation tests.
- Create: `src/features/importer/bundle/import-bundle.ts` — bundle mutation/validation helpers.
- Modify: `src/features/importer/local/import-repository.ts` — persist bundles while keeping legacy draft compatibility during migration.
- Modify: `src/features/importer/local/indexeddb-import-repository.ts` — IndexedDB schema upgrade.
- Modify: `src/features/importer/local/indexeddb-import-repository.test.ts` — bundle round-trip tests.
- Create: `src/features/importer/components/ImportSourceManager.tsx` — module/source/page-role UI.
- Create: `src/features/importer/components/ImportSourceManager.test.tsx` — source assignment UI tests.
- Modify: `src/features/importer/ImportWorkspace.tsx` — orchestrate bundle stages.
- Modify: `src/features/importer/ImportWorkspaceContainer.tsx` — load/save current bundle.

### Reading structure parser

- Create: `src/features/importer/reading/types.ts` — structured Reading draft types.
- Create: `src/features/importer/reading/document-outline.ts` — passage/page/question-range recognition.
- Create: `src/features/importer/reading/document-outline.test.ts`.
- Create: `src/features/importer/reading/instruction-parser.ts` — exact instruction constraints.
- Create: `src/features/importer/reading/instruction-parser.test.ts`.
- Create: `src/features/importer/reading/question-type-recognizers.ts` — deterministic recognizers.
- Create: `src/features/importer/reading/question-type-recognizers.test.ts`.
- Create: `src/features/importer/reading/reading-structure-parser.ts` — compose outline + recognizers.
- Create: `src/features/importer/reading/reading-structure-parser.test.ts`.

### Answer parsing and mapping

- Create: `src/features/importer/answers/types.ts`.
- Create: `src/features/importer/answers/answer-expression-parser.ts`.
- Create: `src/features/importer/answers/answer-expression-parser.test.ts`.
- Create: `src/features/importer/answers/question-answer-mapper.ts`.
- Create: `src/features/importer/answers/question-answer-mapper.test.ts`.

### Schema and renderers

- Modify: `src/test-schema/types.ts` — discriminated Reading question union.
- Create: `src/question-types/TrueFalseNotGivenQuestion.tsx`.
- Create: `src/question-types/MatchingQuestion.tsx`.
- Create: `src/question-types/CompletionQuestion.tsx`.
- Create: `src/question-types/DiagramLabelQuestion.tsx`.
- Create: `src/question-types/TableCompletionQuestion.tsx`.
- Create tests beside each renderer.
- Create: `src/question-types/QuestionRenderer.tsx` — renderer registry.
- Modify: `src/features/reading/ReadingExam.tsx` — use renderer registry.

### Publishing, catalog, scoring

- Create: `src/features/importer/publication/import-publication.ts`.
- Create: `src/features/importer/publication/import-publication.test.ts`.
- Create: `src/test-catalog/test-catalog-repository.ts`.
- Create: `src/test-catalog/supabase-test-catalog.ts`.
- Create: `src/test-catalog/indexeddb-test-catalog.ts`.
- Create tests for both catalog adapters.
- Create: `src/scoring/answer-normalization.ts`.
- Create: `src/scoring/answer-normalization.test.ts`.
- Create: `src/scoring/score-objective-attempt.ts`.
- Create: `src/scoring/score-objective-attempt.test.ts`.
- Modify: `src/features/sessions/SessionBuilder.tsx` — select a published test/version.
- Modify: `src/app/App.tsx` — load selected test package instead of sample.
- Create: `supabase/migrations/<timestamp>_publish_imported_reading_test.sql` — atomic publish RPC + RLS-safe catalog access.
- Create: `supabase/migrations/<timestamp>_score_objective_attempt.sql` — protected server-side scoring RPC.

### Acceptance fixture

- Create a repository-owned synthetic fixture derived from the structure of the user-provided test, not a redistributed copy of the source PDF:
  - `tests/fixtures/reading-import/fixture.json` — extracted/evidence representation for 3 passages/40 questions.
  - `tests/fixtures/reading-import/expected-structure.json` — expected semantic structure.
  - `tests/fixtures/reading-import/expected-answers.json` — protected expected answers.
- Keep the original uploaded PDF outside the repository; use it for manual acceptance verification only.

---

### Task 1: ImportBundle domain and validation

**Files:**
- Create: `src/features/importer/bundle/domain.ts`
- Create: `src/features/importer/bundle/import-bundle.ts`
- Test: `src/features/importer/bundle/import-bundle.test.ts`

**Interfaces:**
- Produces:

```ts
export type ImportModule = 'READING' | 'LISTENING' | 'WRITING';

export type ImportSourceRole =
  | 'QUESTION_MATERIAL'
  | 'ANSWER_KEY'
  | 'AUDIO'
  | 'WRITING_PROMPT'
  | 'STAFF_MARKING_GUIDE'
  | 'SUPPORTING_EVIDENCE';

export interface PageRange {
  startPage: number;
  endPage: number;
}

export interface ImportSourceAssignment {
  sourceDocumentId: string;
  role: ImportSourceRole;
  pageRanges?: PageRange[];
}

export interface ImportBundle {
  id: string;
  module: ImportModule;
  title: string;
  sourceDocuments: SourceDocumentRecord[];
  assignments: ImportSourceAssignment[];
  status:
    | 'COLLECTING_SOURCES'
    | 'EXTRACTING'
    | 'STRUCTURING'
    | 'REVIEW_REQUIRED'
    | 'READY_TO_PREVIEW'
    | 'READY_TO_PUBLISH'
    | 'PUBLISHED';
  updatedAtMs: number;
}

export function validateImportBundle(bundle: ImportBundle): string[];
export function assignSourceRole(
  bundle: ImportBundle,
  assignment: ImportSourceAssignment,
  nowMs: number,
): ImportBundle;
```

- [ ] **Step 1: Write RED tests**

```ts
it('requires Reading question material before structuring', () => {
  const errors = validateImportBundle({
    ...baseBundle,
    module: 'READING',
    assignments: [{ sourceDocumentId: 'answers', role: 'ANSWER_KEY' }],
  });
  expect(errors).toContain('Reading import requires question material');
});

it('allows one PDF to own question and answer page ranges', () => {
  const bundle = assignSourceRole(
    baseBundle,
    {
      sourceDocumentId: 'pdf-1',
      role: 'QUESTION_MATERIAL',
      pageRanges: [{ startPage: 1, endPage: 12 }],
    },
    100,
  );
  const next = assignSourceRole(
    bundle,
    {
      sourceDocumentId: 'pdf-1',
      role: 'ANSWER_KEY',
      pageRanges: [{ startPage: 13, endPage: 13 }],
    },
    101,
  );
  expect(next.assignments).toHaveLength(2);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/features/importer/bundle/import-bundle.test.ts --run
```

Expected: FAIL because the bundle domain/helpers do not exist.

- [ ] **Step 3: Implement minimal domain/helpers**

Validation rules:

- page numbers are positive;
- `startPage <= endPage`;
- Reading requires at least one `QUESTION_MATERIAL` assignment;
- duplicate identical assignment is rejected;
- overlapping page ranges are allowed only when roles differ;
- no automatic module changes.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/bundle/import-bundle.test.ts --run
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/bundle
git commit -m "feat: add import bundle domain"
```

---

### Task 2: Persist ImportBundle and source bytes through IndexedDB

**Files:**
- Modify: `src/features/importer/local/import-repository.ts`
- Modify: `src/features/importer/local/indexeddb-import-repository.ts`
- Test: `src/features/importer/local/indexeddb-import-repository.test.ts`

**Interfaces:**
- Extend `ImportRepository`:

```ts
loadBundle(id: string): Promise<ImportBundle | null>;
saveBundle(bundle: ImportBundle): Promise<void>;
deleteBundle(id: string): Promise<void>;
listBundles(): Promise<ImportBundle[]>;
```

- [ ] **Step 1: Write RED round-trip test**

```ts
it('round-trips a Reading bundle with one PDF used for question and answer page ranges', async () => {
  const bundle: ImportBundle = {
    id: 'bundle-1',
    module: 'READING',
    title: 'Reading Test 1',
    sourceDocuments: [{
      id: 'pdf-1',
      name: 'reading.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 123,
      kind: 'PDF',
      createdAtMs: 1,
      sourceBytes: new TextEncoder().encode('pdf-bytes').buffer,
    }],
    assignments: [
      { sourceDocumentId: 'pdf-1', role: 'QUESTION_MATERIAL', pageRanges: [{ startPage: 1, endPage: 12 }] },
      { sourceDocumentId: 'pdf-1', role: 'ANSWER_KEY', pageRanges: [{ startPage: 13, endPage: 13 }] },
    ],
    status: 'COLLECTING_SOURCES',
    updatedAtMs: 2,
  };

  await repository.saveBundle(bundle);
  const restored = await repository.loadBundle('bundle-1');

  expect(restored).toEqual(bundle);
  expect(new TextDecoder().decode(restored?.sourceDocuments[0].sourceBytes)).toBe('pdf-bytes');
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/local/indexeddb-import-repository.test.ts --run
```

Expected: FAIL because bundle methods do not exist.

- [ ] **Step 3: Implement IndexedDB schema upgrade**

Use a new object store `import-bundles` rather than mutating the existing `import-drafts` layout. Keep legacy draft methods until the workspace migration is complete.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/local/indexeddb-import-repository.test.ts --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/local
git commit -m "feat: persist import bundles locally"
```

---

### Task 3: Module/source/page-role UI

**Files:**
- Create: `src/features/importer/components/ImportSourceManager.tsx`
- Test: `src/features/importer/components/ImportSourceManager.test.tsx`
- Modify: `src/features/importer/ImportWorkspace.tsx`
- Modify: `src/features/importer/ImportWorkspaceContainer.tsx`

**Interfaces:**

```ts
interface ImportSourceManagerProps {
  bundle: ImportBundle | null;
  onCreate(module: ImportModule, title: string): void;
  onAddFiles(files: File[]): void;
  onAssign(assignment: ImportSourceAssignment): void;
}
```

- [ ] **Step 1: Write RED UI tests**

```tsx
it('requires the administrator to choose Reading explicitly', async () => {
  render(<ImportSourceManager bundle={null} {...handlers} />);
  await user.click(screen.getByRole('button', { name: 'Reading' }));
  expect(handlers.onCreate).toHaveBeenCalledWith('READING', expect.any(String));
});

it('assigns pages 1-12 as questions and page 13 as answers', async () => {
  render(<ImportSourceManager bundle={readingBundleWith13PagePdf} {...handlers} />);
  await user.selectOptions(screen.getByLabelText('Source role'), 'QUESTION_MATERIAL');
  await user.type(screen.getByLabelText('Start page'), '1');
  await user.type(screen.getByLabelText('End page'), '12');
  await user.click(screen.getByRole('button', { name: 'Assign pages' }));
  expect(handlers.onAssign).toHaveBeenCalledWith(expect.objectContaining({
    role: 'QUESTION_MATERIAL',
    pageRanges: [{ startPage: 1, endPage: 12 }],
  }));
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/components/ImportSourceManager.test.tsx --run
```

- [ ] **Step 3: Implement UI**

Requirements:

- module choice is explicit;
- multi-file input uses `multiple`;
- show each source separately;
- PDF role UI supports page ranges;
- no "detected module" field;
- retain existing evidence/review UI after structuring begins.

- [ ] **Step 4: Run component + App regression tests**

```bash
npm test -- src/features/importer/components/ImportSourceManager.test.tsx src/app/App.test.tsx --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/importer
git commit -m "feat: add manual import bundle source manager"
```

---

### Task 4: Reading document outline parser

**Files:**
- Create: `src/features/importer/reading/types.ts`
- Create: `src/features/importer/reading/document-outline.ts`
- Test: `src/features/importer/reading/document-outline.test.ts`
- Create: `tests/fixtures/reading-import/fixture.json`

**Interfaces:**

```ts
export interface ReadingSourceBlock {
  pageNumber: number;
  text: string;
  evidence: SourceEvidence[];
}

export interface PassageOutline {
  passageNumber: number;
  title: string | null;
  pageNumbers: number[];
}

export interface QuestionRangeOutline {
  start: number;
  end: number;
  pageNumbers: number[];
  instructionText: string;
}

export interface ReadingDocumentOutline {
  passages: PassageOutline[];
  questionRanges: QuestionRangeOutline[];
}

export function parseReadingDocumentOutline(
  blocks: ReadingSourceBlock[],
): ReadingDocumentOutline;
```

- [ ] **Step 1: Build synthetic extracted fixture**

The fixture must encode the structure of the uploaded PDF without copying the full copyrighted passages. Include headings/instructions sufficient for structure recognition:

```json
{
  "blocks": [
    { "pageNumber": 1, "text": "Passage 1\nThe Layers of the Sun\n[passage text omitted]" },
    { "pageNumber": 3, "text": "Questions 1-4\nLabel the diagram below..." },
    { "pageNumber": 4, "text": "Questions 5-9\nComplete each sentence with the correct ending A-I..." },
    { "pageNumber": 4, "text": "Questions 10-14\nDo the following statements agree..." },
    { "pageNumber": 5, "text": "Passage 2\nThe Changing Landscape of Oceania\n[passage text omitted]" },
    { "pageNumber": 6, "text": "Questions 15-19\nChoose NO MORE THAN TWO WORDS AND/OR A NUMBER..." },
    { "pageNumber": 7, "text": "Questions 20-24\nChoose the correct headings..." },
    { "pageNumber": 8, "text": "Questions 25-27\nChoose the appropriate letters A, B, C or D" },
    { "pageNumber": 9, "text": "Passage 3\nSpanish Exploration and Conquest\n[passage text omitted]" },
    { "pageNumber": 11, "text": "Questions 28-31\nComplete the table below..." },
    { "pageNumber": 11, "text": "Questions 32-36\nWhich paragraphs contain the following information?" },
    { "pageNumber": 12, "text": "Questions 37-40\nMatch each piece of information with the correct person A-E." }
  ]
}
```

- [ ] **Step 2: Write RED tests**

Assert exactly 3 passages and question ranges `1-4, 5-9, 10-14, 15-19, 20-24, 25-27, 28-31, 32-36, 37-40`.

- [ ] **Step 3: Run RED**

```bash
npm test -- src/features/importer/reading/document-outline.test.ts --run
```

- [ ] **Step 4: Implement deterministic heading/range parser**

Use explicit patterns:

```ts
const PASSAGE_HEADING = /^Passage\s+(\d+)\b/im;
const QUESTION_RANGE = /Questions?\s+(\d+)\s*[-–]\s*(\d+)/gi;
```

Do not infer missing numbers. A malformed or overlapping range returns a structural issue for review.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/features/importer/reading/document-outline.test.ts --run
git add src/features/importer/reading tests/fixtures/reading-import/fixture.json
git commit -m "feat: parse Reading document outline"
```

---

### Task 5: Instruction constraints and question-type recognizers

**Files:**
- Create: `src/features/importer/reading/instruction-parser.ts`
- Test: `src/features/importer/reading/instruction-parser.test.ts`
- Create: `src/features/importer/reading/question-type-recognizers.ts`
- Test: `src/features/importer/reading/question-type-recognizers.test.ts`

**Interfaces:**

```ts
export interface InstructionConstraints {
  maxWords?: number;
  numbersAllowed?: boolean;
  optionLabels?: string[];
}

export type ReadingQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE_NOT_GIVEN'
  | 'YES_NO_NOT_GIVEN'
  | 'MATCHING_INFORMATION'
  | 'MATCHING_HEADINGS'
  | 'MATCHING_FEATURES'
  | 'MATCHING_SENTENCE_ENDINGS'
  | 'SHORT_ANSWER'
  | 'SENTENCE_COMPLETION'
  | 'SUMMARY_COMPLETION'
  | 'NOTE_COMPLETION'
  | 'TABLE_COMPLETION'
  | 'FLOW_CHART_COMPLETION'
  | 'DIAGRAM_LABEL_COMPLETION';

export interface QuestionTypeRecognition {
  type: ReadingQuestionType | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export function parseInstructionConstraints(text: string): InstructionConstraints;
export function recognizeReadingQuestionType(input: {
  instructionText: string;
  bodyText: string;
  hasDiagram: boolean;
  hasTable: boolean;
}): QuestionTypeRecognition;
```

- [ ] **Step 1: Write RED instruction tests**

Include:

```ts
expect(parseInstructionConstraints('Choose NO MORE THAN TWO WORDS AND/OR A NUMBER')).toEqual({
  maxWords: 2,
  numbersAllowed: true,
});

expect(parseInstructionConstraints('Choose NO MORE THAN TWO WORDS')).toEqual({
  maxWords: 2,
  numbersAllowed: false,
});
```

- [ ] **Step 2: Write RED recognizer tests**

Assert fixture ranges map to:

- 1–4 `DIAGRAM_LABEL_COMPLETION`
- 5–9 `MATCHING_SENTENCE_ENDINGS`
- 10–14 `TRUE_FALSE_NOT_GIVEN`
- 15–19 `SHORT_ANSWER`
- 20–24 `MATCHING_HEADINGS`
- 25–27 `SINGLE_CHOICE`
- 28–31 `TABLE_COMPLETION`
- 32–36 `MATCHING_INFORMATION`
- 37–40 `MATCHING_FEATURES`

- [ ] **Step 3: Run RED**

```bash
npm test -- src/features/importer/reading/instruction-parser.test.ts src/features/importer/reading/question-type-recognizers.test.ts --run
```

- [ ] **Step 4: Implement minimal deterministic rules**

No ML/LLM classifier. Ambiguous wording returns `MEDIUM` or `LOW` with `type: null` where necessary.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/features/importer/reading/instruction-parser.test.ts src/features/importer/reading/question-type-recognizers.test.ts --run
git add src/features/importer/reading
git commit -m "feat: recognize Reading question instructions and types"
```

---

### Task 6: Expand the student Reading schema

**Files:**
- Modify: `src/test-schema/types.ts`
- Modify: `src/test-schema/sample-reading.ts`
- Test: create `src/test-schema/types.test.ts`

**Interfaces:**

Use a discriminated question union. Shared base:

```ts
export interface QuestionBase {
  id: string;
  number: number;
  prompt: string;
  instructionConstraints?: {
    maxWords?: number;
    numbersAllowed?: boolean;
  };
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'SINGLE_CHOICE';
  options: ChoiceOption[];
}

export interface TrueFalseNotGivenQuestion extends QuestionBase {
  type: 'TRUE_FALSE_NOT_GIVEN';
}

export interface MatchingQuestion extends QuestionBase {
  type:
    | 'MATCHING_INFORMATION'
    | 'MATCHING_HEADINGS'
    | 'MATCHING_FEATURES'
    | 'MATCHING_SENTENCE_ENDINGS';
  options: ChoiceOption[];
  allowOptionReuse: boolean;
}

export interface TextCompletionQuestion extends QuestionBase {
  type:
    | 'SHORT_ANSWER'
    | 'SENTENCE_COMPLETION'
    | 'SUMMARY_COMPLETION'
    | 'NOTE_COMPLETION'
    | 'FLOW_CHART_COMPLETION';
}

export interface DiagramLabelQuestion extends QuestionBase {
  type: 'DIAGRAM_LABEL_COMPLETION';
  assetId: string;
  anchor: { x: number; y: number; width: number; height: number };
}

export interface TableCompletionQuestion extends QuestionBase {
  type: 'TABLE_COMPLETION';
  tableId: string;
  cellId: string;
}
```

Keep `GAP_FILL` temporarily for backward compatibility with `sampleReadingTest`.

- [ ] **Step 1: Write RED type/shape tests**

Create representative objects for every new question type and assert the renderer registry in later tasks can discriminate them without casting.

- [ ] **Step 2: Run RED typecheck**

```bash
npm run typecheck
```

Expected: FAIL until the union is expanded and sample fixture adjusted.

- [ ] **Step 3: Implement schema expansion**

`StudentTestPackage.modules` may remain Reading-only in this plan; Listening/Writing union is deferred to their own plans.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/test-schema/types.test.ts --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/test-schema
git commit -m "feat: expand Reading question schema"
```

---

### Task 7: Compose the Reading structure parser

**Files:**
- Create: `src/features/importer/reading/reading-structure-parser.ts`
- Test: `src/features/importer/reading/reading-structure-parser.test.ts`
- Create: `tests/fixtures/reading-import/expected-structure.json`

**Interfaces:**

```ts
export interface StructuredReadingDraft {
  title: string;
  sections: ReadingSectionDraft[];
  reviewItems: StructureReviewItem[];
}

export function buildStructuredReadingDraft(input: {
  blocks: ReadingSourceBlock[];
  visualRegions: ImportedVisualRegion[];
}): StructuredReadingDraft;
```

- [ ] **Step 1: Write RED integration test**

Assert the synthetic fixture produces:

```ts
expect(draft.sections).toHaveLength(3);
expect(allQuestions(draft)).toHaveLength(40);
expect(questionTypesByRange(draft)).toEqual([
  ['1-4', 'DIAGRAM_LABEL_COMPLETION'],
  ['5-9', 'MATCHING_SENTENCE_ENDINGS'],
  ['10-14', 'TRUE_FALSE_NOT_GIVEN'],
  ['15-19', 'SHORT_ANSWER'],
  ['20-24', 'MATCHING_HEADINGS'],
  ['25-27', 'SINGLE_CHOICE'],
  ['28-31', 'TABLE_COMPLETION'],
  ['32-36', 'MATCHING_INFORMATION'],
  ['37-40', 'MATCHING_FEATURES'],
]);
```

Also assert missing/ambiguous content creates `reviewItems` instead of fake questions.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/reading-structure-parser.test.ts --run
```

- [ ] **Step 3: Implement parser composition**

Do not combine extraction with structure parsing. Consume already extracted/evidence-backed blocks.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/reading/reading-structure-parser.test.ts --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/reading tests/fixtures/reading-import/expected-structure.json
git commit -m "feat: build structured Reading drafts"
```

---

### Task 8: Visual asset/crop preservation for diagram and table questions

**Files:**
- Create: `src/features/importer/reading/visual-region-linker.ts`
- Test: `src/features/importer/reading/visual-region-linker.test.ts`
- Modify: `src/features/importer/reading/types.ts`

**Interfaces:**

```ts
export interface ImportedVisualRegion {
  id: string;
  sourceDocumentId: string;
  pageNumber: number;
  crop: NormalizedRect;
  kind: 'DIAGRAM' | 'TABLE' | 'OTHER';
}

export interface VisualAnchorDraft {
  questionNumber: number;
  visualRegionId: string;
  anchor: NormalizedRect | null;
  verificationState: VerificationState;
}

export function linkVisualQuestions(input: {
  questions: ReadingQuestionDraft[];
  regions: ImportedVisualRegion[];
}): {
  anchors: VisualAnchorDraft[];
  reviewItems: StructureReviewItem[];
};
```

- [ ] **Step 1: Write RED tests**

Assert Q1–4 link to one diagram region, Q28–31 link to one table region, and missing anchor geometry creates review items rather than guessed coordinates.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/visual-region-linker.test.ts --run
```

- [ ] **Step 3: Implement deterministic region linking**

Page/question-group association may be automatic when exactly one compatible visual exists on the question page. Anchor positions remain unresolved unless source geometry provides them.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/features/importer/reading/visual-region-linker.test.ts --run
git add src/features/importer/reading
git commit -m "feat: preserve Reading visual question regions"
```

---

### Task 9: Answer shorthand parser

**Files:**
- Create: `src/features/importer/answers/types.ts`
- Create: `src/features/importer/answers/answer-expression-parser.ts`
- Test: `src/features/importer/answers/answer-expression-parser.test.ts`

**Interfaces:**

```ts
export interface AnswerNormalizationPolicy {
  caseSensitive: boolean;
  collapseWhitespace: boolean;
  punctuation: 'STRICT' | 'IGNORE_TERMINAL' | 'LENIENT';
  maxWords?: number;
  numbersAllowed?: boolean;
  orderSensitive?: boolean;
}

export interface AnswerDefinitionDraft {
  questionNumber: number;
  canonical: string[];
  alternatives: string[][];
  normalization: AnswerNormalizationPolicy;
  sourceEvidence: SourceEvidence[];
  verificationState: VerificationState;
}

export function parseAnswerExpression(input: {
  questionNumber: number;
  raw: string;
  constraints: InstructionConstraints;
  evidence: SourceEvidence[];
}): AnswerDefinitionDraft;
```

- [ ] **Step 1: Write RED tests for real key notation**

```ts
expect(parse('1', '(The) corona')).toAccept(['corona', 'the corona']);
expect(parse('16', '(strict) quarantine')).toAccept(['quarantine', 'strict quarantine']);
expect(parse('17', '(around) six/6 years')).toAccept([
  'six years',
  '6 years',
  'around six years',
  'around 6 years',
]);
expect(parse('18', 'ninety/90 percent/per cent/%')).toRequireReview();
```

The last case is deliberately review-required because slash semantics are ambiguous.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/answers/answer-expression-parser.test.ts --run
```

- [ ] **Step 3: Implement conservative parser**

Only expand parenthetical optional prefixes and unambiguous simple alternatives. Complex chained slash notation remains `REVIEW_REQUIRED`.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/features/importer/answers/answer-expression-parser.test.ts --run
git add src/features/importer/answers
git commit -m "feat: parse protected answer expressions"
```

---

### Task 10: Map all protected answers and enforce coverage

**Files:**
- Create: `src/features/importer/answers/question-answer-mapper.ts`
- Test: `src/features/importer/answers/question-answer-mapper.test.ts`
- Create: `tests/fixtures/reading-import/expected-answers.json`

**Interfaces:**

```ts
export interface AnswerCoverageResult {
  definitions: Record<string, AnswerDefinitionDraft>;
  missingQuestionNumbers: number[];
  duplicateQuestionNumbers: number[];
  unmappedAnswerNumbers: number[];
  blockingReasons: string[];
}

export function mapAnswersToQuestions(input: {
  questions: ReadingQuestionDraft[];
  answerEntries: ParsedAnswerEntry[];
}): AnswerCoverageResult;
```

- [ ] **Step 1: Write RED tests**

Use a synthetic 1–40 answer fixture matching the uploaded key's structure. Assert:

- 40 questions -> 40 mapped definitions;
- one removed answer produces `missingQuestionNumbers: [17]`;
- duplicate answer 25 blocks publication;
- answer 41 becomes `unmappedAnswerNumbers: [41]`.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/answers/question-answer-mapper.test.ts --run
```

- [ ] **Step 3: Implement mapping by question number**

Question number is the import key; generated immutable question ID becomes the published key.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/features/importer/answers/question-answer-mapper.test.ts --run
git add src/features/importer/answers tests/fixtures/reading-import/expected-answers.json
git commit -m "feat: map Reading answers with coverage checks"
```

---

### Task 11: Reading question renderer registry

**Files:**
- Create: `src/question-types/QuestionRenderer.tsx`
- Create renderer components/tests listed in File Map.
- Modify: `src/features/reading/ReadingExam.tsx`

**Interfaces:**

```tsx
interface QuestionRendererProps {
  question: StudentQuestion;
  value: string | string[] | undefined;
  onChange(value: string | string[]): void;
  disabled: boolean;
}

export function QuestionRenderer(props: QuestionRendererProps): React.ReactNode;
```

- [ ] **Step 1: Write RED renderer tests**

At minimum:

```tsx
it('renders TFNG as three exclusive choices', ...);
it('renders matching headings with the supplied heading list', ...);
it('renders matching features with reusable options when configured', ...);
it('renders diagram label question with the retained visual asset', ...);
it('renders table completion inside the table structure', ...);
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/question-types --run
```

- [ ] **Step 3: Implement focused renderers + registry**

Do not put all markup inside one switch in `ReadingExam.tsx`.

- [ ] **Step 4: Replace existing `renderQuestion` helper**

`ReadingExam` delegates to `QuestionRenderer`.

- [ ] **Step 5: Run full Reading UI tests**

```bash
npm test -- src/question-types src/features/reading --run
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/question-types src/features/reading
git commit -m "feat: render complete Reading question types"
```

---

### Task 12: Semantic review queue instead of giant OCR fields

**Files:**
- Create: `src/features/importer/review/semantic-review.ts`
- Test: `src/features/importer/review/semantic-review.test.ts`
- Modify: `src/features/importer/ImportWorkspace.tsx`
- Modify: `src/features/importer/components/SourceEvidencePane.tsx`
- Modify: `src/features/importer/components/ConflictEditor.tsx`

**Interfaces:**

```ts
export interface SemanticReviewItem {
  id: string;
  kind:
    | 'PASSAGE_TITLE'
    | 'INSTRUCTION'
    | 'QUESTION_TEXT'
    | 'QUESTION_TYPE'
    | 'OPTION'
    | 'VISUAL_ANCHOR'
    | 'ANSWER_DEFINITION';
  label: string;
  critical: boolean;
  value: string | null;
  evidence: SourceEvidence[];
  state: VerificationState;
}

export function buildSemanticReviewQueue(input: {
  structuredDraft: StructuredReadingDraft;
  answers: AnswerCoverageResult;
}): SemanticReviewItem[];
```

- [ ] **Step 1: Write RED test**

Assert the queue contains semantic items such as `Questions 10–14 instruction` and `Q17 accepted answer`, not one page-long passage blob.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/review/semantic-review.test.ts --run
```

- [ ] **Step 3: Implement queue + UI binding**

`CONFIRMED` may only be set by explicit review action.

- [ ] **Step 4: Add regression test for random screenshot**

Importing one arbitrary screenshot with no Reading question structure must show:

```text
No complete Reading test structure could be created
```

and publication remains disabled.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/features/importer/review src/features/importer/ImportWorkspace.test.tsx --run
git add src/features/importer
git commit -m "feat: review structured Reading import items"
```

---

### Task 13: Build student-safe package and protected answer package

**Files:**
- Modify: `src/test-schema/import-mapper.ts`
- Test: `src/test-schema/import-mapper.test.ts`
- Create: `src/features/importer/publication/import-publication.ts`
- Test: `src/features/importer/publication/import-publication.test.ts`

**Interfaces:**

```ts
export interface PreparedReadingPublication {
  studentPackage: StudentTestPackage;
  protectedAnswers: Record<string, AnswerDefinitionDraft>;
}

export function prepareReadingPublication(input: {
  bundle: ImportBundle;
  structuredDraft: StructuredReadingDraft;
  answerCoverage: AnswerCoverageResult;
  reviewItems: SemanticReviewItem[];
}): {
  ok: true;
  value: PreparedReadingPublication;
} | {
  ok: false;
  reasons: string[];
};
```

- [ ] **Step 1: Write RED safety tests**

```ts
it('never serializes protected answers into studentPackage', () => {
  const result = prepareReadingPublication(completeInput);
  expect(result.ok).toBe(true);
  expect(JSON.stringify(result.ok ? result.value.studentPackage : {}))
    .not.toMatch(/correctAnswer|protectedAnswers|canonical/);
});

it('blocks publish when answer coverage is incomplete', ...);
it('blocks publish when a critical semantic review item is unresolved', ...);
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/test-schema/import-mapper.test.ts src/features/importer/publication/import-publication.test.ts --run
```

- [ ] **Step 3: Implement package preparation**

Duration for standard Reading profile = `60 * 60` seconds unless explicitly configured otherwise.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/test-schema/import-mapper.test.ts src/features/importer/publication/import-publication.test.ts --run
git add src/test-schema src/features/importer/publication
git commit -m "feat: prepare safe Reading publications"
```

---

### Task 14: Atomic Supabase publication RPC

**Files:**
- Create: `supabase/migrations/<timestamp>_publish_imported_reading_test.sql`
- Create: `src/features/importer/publication/supabase-publisher.ts`
- Test: `src/features/importer/publication/supabase-publisher.test.ts`

**Interfaces:**

```ts
export interface ImportedTestPublisher {
  publish(input: PreparedReadingPublication & {
    title: string;
    testId?: string;
  }): Promise<{ testId: string; versionId: string; versionNumber: number }>;
}
```

SQL RPC contract:

```sql
private/public function name: publish_imported_reading_test(
  p_test_id uuid,
  p_title text,
  p_student_content jsonb,
  p_answers jsonb
)
```

Implementation requirements:

- authenticated staff only;
- create/update draft `tests` row;
- compute next version number;
- insert student-safe `test_versions.content`;
- insert protected `answer_definitions`;
- set `published_at`;
- set test status `published`;
- all in one transaction;
- existing publication guard remains active;
- no student SELECT policy on `answer_definitions`.

- [ ] **Step 1: Write adapter RED test with mocked RPC**

Assert exact payload separation: student content and answers are separate RPC arguments.

- [ ] **Step 2: Apply migration to Supabase test/live project only after SQL review**

Before applying:

```bash
npm run typecheck
npm test -- src/features/importer/publication --run
```

- [ ] **Step 3: Apply migration**

Use Supabase migration tooling; record the exact live migration version back into GitHub.

- [ ] **Step 4: Run Supabase advisors**

Expected:

- security advisor: zero ERROR/WARN lints introduced;
- performance advisor: inspect new warnings; do not remove useful new indexes merely because the database is initially empty.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations src/features/importer/publication
git commit -m "feat: publish imported Reading tests atomically"
```

---

### Task 15: Published test catalog

**Files:**
- Create: `src/test-catalog/test-catalog-repository.ts`
- Create: `src/test-catalog/supabase-test-catalog.ts`
- Create: `src/test-catalog/indexeddb-test-catalog.ts`
- Test: `src/test-catalog/supabase-test-catalog.test.ts`
- Test: `src/test-catalog/indexeddb-test-catalog.test.ts`

**Interfaces:**

```ts
export interface TestSummary {
  testId: string;
  versionId: string;
  title: string;
  modules: Array<'READING' | 'LISTENING' | 'WRITING'>;
}

export interface TestCatalogRepository {
  listPublishedTests(): Promise<TestSummary[]>;
  loadPublishedTest(testId: string, versionId: string): Promise<StudentTestPackage>;
  saveLocalTest(test: StudentTestPackage): Promise<void>;
}
```

- [ ] **Step 1: Write RED catalog tests**

Assert unpublished tests never appear in the Supabase catalog and local catalog can load a saved published package offline.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/test-catalog --run
```

- [ ] **Step 3: Implement adapters**

Supabase adapter reads only `tests` + `test_versions.content`; it never reads `answer_definitions`.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/test-catalog --run
npm run typecheck
git add src/test-catalog
git commit -m "feat: add published test catalog"
```

---

### Task 16: SessionBuilder selects and launches the imported test

**Files:**
- Modify: `src/features/sessions/SessionBuilder.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Test: `src/features/sessions/SessionBuilder.test.tsx`

**Interfaces:**

Add to `SessionBuilderProps`:

```ts
tests: TestSummary[];
selectedTestVersionId?: string;
onTestSelected?(summary: TestSummary): void;
```

App state stores the selected `StudentTestPackage`.

- [ ] **Step 1: Write RED App integration test**

```tsx
it('launches the selected imported Reading package instead of sampleReadingTest', async () => {
  render(<App testCatalog={fakeCatalogWithImportedReading} />);
  await user.selectOptions(screen.getByLabelText('Published test'), 'version-imported-1');
  await user.click(screen.getByLabelText('Reading'));
  await user.click(screen.getByRole('button', { name: 'Create session' }));

  expect(await screen.findByText('The Layers of the Sun')).toBeInTheDocument();
  expect(screen.queryByText('Urban green spaces')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/sessions/SessionBuilder.test.tsx src/app/App.test.tsx --run
```

- [ ] **Step 3: Implement catalog selection and package loading**

Keep `sampleReadingTest` only as a development/test fixture, not the production launch source.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/sessions/SessionBuilder.test.tsx src/app/App.test.tsx src/features/reading --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/sessions src/app
git commit -m "feat: launch selected published Reading tests"
```

---

### Task 17: Objective answer normalization and scoring domain

**Files:**
- Create: `src/scoring/answer-normalization.ts`
- Test: `src/scoring/answer-normalization.test.ts`
- Create: `src/scoring/score-objective-attempt.ts`
- Test: `src/scoring/score-objective-attempt.test.ts`

**Interfaces:**

```ts
export function normalizeResponse(
  value: string,
  policy: AnswerNormalizationPolicy,
): string;

export interface ObjectiveScore {
  rawScore: number;
  totalQuestions: number;
  outcomes: Array<{
    questionId: string;
    correct: boolean;
    ruleViolation?: 'MAX_WORDS';
  }>;
}

export function scoreObjectiveAttempt(input: {
  responses: Record<string, string | string[]>;
  definitions: Record<string, AnswerDefinitionDraft>;
}): ObjectiveScore;
```

- [ ] **Step 1: Write RED scoring tests**

Cover:

- case-insensitive `Corona` accepted for `corona`;
- `the corona` accepted when explicitly listed;
- `6 years` and `six years` accepted when explicitly listed;
- a three-word response fails when `maxWords: 2`;
- TFNG `FALSE` matches normalized `F` only when enum policy explicitly allows aliases;
- semantic near-match is not accepted.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/scoring --run
```

- [ ] **Step 3: Implement deterministic normalization/scoring**

No generative or embedding similarity.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/scoring --run
git add src/scoring
git commit -m "feat: score objective Reading answers"
```

---

### Task 18: Protected server-side scoring RPC and results integration

**Files:**
- Create: `supabase/migrations/<timestamp>_score_objective_attempt.sql`
- Create: `src/scoring/supabase-score-client.ts`
- Test: `src/scoring/supabase-score-client.test.ts`
- Modify: `src/session/types.ts`
- Modify: `src/features/results/SessionResult.tsx`
- Modify tests for result UI.

**RPC requirements:**

- caller may score only own submitted attempt unless staff;
- reads protected `answer_definitions` server-side;
- validates responses against the exact `test_version_id`;
- stores/returns `raw_score` and `total_questions`;
- does not return protected canonical alternatives before submission;
- repeated scoring request is idempotent.

- [ ] **Step 1: Write RED score-client and result tests**

Assert a returned Reading score `34 / 40` renders correctly and no overall IELTS band is fabricated.

- [ ] **Step 2: Implement SQL + client**

- [ ] **Step 3: Apply migration and run advisors**

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/scoring src/features/results --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations src/scoring src/session src/features/results
git commit -m "feat: score Reading attempts with protected answers"
```

---

### Task 19: End-to-end Reading fixture acceptance test

**Files:**
- Create: `src/features/importer/reading/reading-import-acceptance.test.ts`
- Modify fixture files under `tests/fixtures/reading-import/`

**Interfaces:**
- Consumes the public functions from Tasks 4–18.

- [ ] **Step 1: Write acceptance test**

The test must prove:

```ts
expect(result.module).toBe('READING');
expect(result.sections).toHaveLength(3);
expect(allQuestions(result.studentPackage)).toHaveLength(40);
expect(result.protectedAnswers).toHaveLength(40);
expect(result.studentPackageJson).not.toContain('canonical');
expect(result.question(1).type).toBe('DIAGRAM_LABEL_COMPLETION');
expect(result.question(10).type).toBe('TRUE_FALSE_NOT_GIVEN');
expect(result.question(20).type).toBe('MATCHING_HEADINGS');
expect(result.question(28).type).toBe('TABLE_COMPLETION');
expect(result.question(37).type).toBe('MATCHING_FEATURES');
```

Also score a synthetic attempt and assert deterministic raw score.

- [ ] **Step 2: Run RED if any integration gap remains**

```bash
npm test -- src/features/importer/reading/reading-import-acceptance.test.ts --run
```

- [ ] **Step 3: Fix only uncovered integration gaps**

Do not broaden scope into Listening/Writing/URL import.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/reading/reading-import-acceptance.test.ts --run
```

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/reading tests/fixtures/reading-import
git commit -m "test: verify complete Reading import to score flow"
```

---

### Task 20: Final independent verification and live deployment gate

**Files:**
- No new production files unless verification finds a defect.

- [ ] **Step 1: Run full CI-equivalent locally/through branch CI**

```bash
npm install --no-audit --no-fund
npm run typecheck
npm test -- --run
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Inspect branch diff against `main`**

Confirm:

- no answer data in student fixtures/bundles intended for delivery;
- no accidental changes to Listening/Writing semantics;
- no PDF/OCR CDN regression;
- no hard-coded uploaded-test content in production source;
- `sampleReadingTest` is not used as production launch source.

- [ ] **Step 3: Run Supabase security + performance advisors**

Security must remain clean before merge.

- [ ] **Step 4: Manual acceptance with the user-provided PDF**

Using the live/local app:

1. choose Reading;
2. upload the 13-page PDF;
3. assign pages 1–12 `QUESTION_MATERIAL`;
4. assign page 13 `ANSWER_KEY`;
5. confirm it builds 3 passages and 40 questions;
6. inspect Q1–4 diagram;
7. inspect Q28–31 table;
8. resolve any answer shorthand review items;
9. preview student package;
10. publish;
11. select the published test in Session setup;
12. start it;
13. submit a controlled set of answers;
14. verify raw score against the protected key.

- [ ] **Step 5: Open PR**

PR summary must include:

- fixture acceptance counts;
- CI evidence;
- Supabase advisor result;
- known limitations;
- explicit statement that Listening/Writing/URL import are not part of this PR.

- [ ] **Step 6: Merge only after PR checks are green**

Use GitHub-generated merge/squash commit so Netlify private-repo production deployment follows the already-working trusted-committer path.

- [ ] **Step 7: Verify Netlify production**

Confirm:

- production deploy commit equals merged `main` commit;
- deploy state `ready`;
- Import page exposes manual Reading/source-role flow;
- published imported Reading test can be selected and launched.

- [ ] **Step 8: Record next plans**

After the Reading path is live, create separate plans for:

1. Listening import + audio player completion;
2. Writing import + computer/paper player completion;
3. URL import + optional external web evidence.

---

## Self-Review Results

### Spec coverage

Covered in this plan:

- manual module choice;
- multi-source bundles;
- same-PDF page roles;
- Reading semantic structure;
- all question types needed by the supplied 40-question fixture;
- visual preservation;
- answer shorthand parsing;
- protected answers;
- coverage gates;
- semantic review;
- student-safe package;
- atomic publication;
- test catalog;
- real session launch;
- deterministic scoring;
- results;
- offline local catalog/persistence;
- immutable versioning;
- full verification/deployment gate.

Deferred deliberately to separate approved-architecture plans:

- Listening audio import/player;
- Writing import/player;
- public URL importer;
- optional external web evidence provider.

### Placeholder scan

The plan contains no unfinished placeholder markers or vague implementation gaps. Deferred features are explicitly scoped into separate plans rather than left ambiguous inside this one.

### Type consistency

The plan consistently uses:

- `ImportBundle`
- `ImportSourceAssignment`
- `StructuredReadingDraft`
- `AnswerDefinitionDraft`
- `AnswerCoverageResult`
- `PreparedReadingPublication`
- `TestCatalogRepository`
- `StudentTestPackage`

Question number is the import-time mapping key; immutable question ID is the publish/runtime scoring key.
