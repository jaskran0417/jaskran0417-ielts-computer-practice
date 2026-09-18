# Reading Import Bundle → Runnable Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a manually selected Reading import bundle into a verified, publishable, runnable Reading test with protected answer definitions and scored results.

**Architecture:** Extend the existing local extraction/verification foundation with an ImportBundle domain, deterministic Reading structure recognizers, a richer question schema/renderer registry, protected answer mapping, Supabase publication/scoring boundaries, and a published-test catalog used by SessionBuilder. The supplied 13-page Reading PDF is the end-to-end acceptance fixture: pages 1–12 are question material, page 13 is the answer key, producing 3 passages and 40 questions.

**Tech Stack:** React 19.3, TypeScript 7, Vite 8, Vitest 5, IndexedDB/idb 8, PDF.js 4.10.38 legacy display layer, Tesseract.js 6.0.1, Supabase PostgreSQL/Auth/RLS/RPC.

**Spec:** `docs/superpowers/specs/2026-09-18-import-bundle-runnable-test-converter-design.md`

## Global Constraints

- The administrator chooses the module; do not implement automatic Reading/Listening/Writing detection.
- Core local conversion must work without internet after runtime assets are present.
- Supplied answer keys outrank optional internet evidence.
- Internet evidence may support review but must never silently overwrite a supplied answer.
- Uncertain critical structure must become `REVIEW_REQUIRED`; never silently invent question text, instructions, options, answer mappings, or visual anchors.
- Student-safe test payloads must contain no protected answers.
- Published test versions are immutable.
- Same-PDF question and answer pages must be supported.
- Windows 7 browser floor remains Firefox ESR 115, with Chrome 109 / Edge 109 best effort.
- Keep `pdfjs-dist@4.10.38`, `tesseract.js@6.0.1`, and local OCR assets pinned.
- Use TDD for every production behavior.
- Do not change Listening/Writing behavior in this plan except where shared types must remain forward-compatible.
- Do not merge implementation into `main` until full typecheck, full tests, production build, Supabase advisor checks, and the Reading fixture acceptance test are green.

---

## File map

### Import bundle and persistence

- Create: `src/features/importer/bundle/types.ts` — ImportBundle, source assignments, page roles, structured draft types.
- Create: `src/features/importer/bundle/validation.ts` — bundle/page-role validation and publication readiness.
- Create: `src/features/importer/bundle/validation.test.ts`.
- Create: `src/features/importer/local/import-bundle-repository.ts` — local repository contract.
- Create: `src/features/importer/local/indexeddb-import-bundle-repository.ts`.
- Create: `src/features/importer/local/indexeddb-import-bundle-repository.test.ts`.
- Modify: `src/features/importer/ImportWorkspace.tsx` — manual module, multi-source, source/page roles, structure/review states.
- Modify: `src/features/importer/ImportWorkspaceContainer.tsx` — persist/load bundles instead of a single-file draft.
- Modify: `src/features/importer/import-workspace.css`.

### Reading structuring

- Create: `src/features/importer/reading/reading-structure.ts` — structured Reading draft types.
- Create: `src/features/importer/reading/document-outline-parser.ts`.
- Create: `src/features/importer/reading/document-outline-parser.test.ts`.
- Create: `src/features/importer/reading/question-range-parser.ts`.
- Create: `src/features/importer/reading/question-range-parser.test.ts`.
- Create: `src/features/importer/reading/instruction-parser.ts`.
- Create: `src/features/importer/reading/instruction-parser.test.ts`.
- Create: `src/features/importer/reading/question-type-recognizer.ts`.
- Create: `src/features/importer/reading/question-type-recognizer.test.ts`.
- Create: `src/features/importer/reading/reading-structure-parser.ts`.
- Create: `src/features/importer/reading/reading-structure-parser.test.ts`.

### Student schema and renderers

- Modify: `src/test-schema/types.ts` — discriminated Reading question types and visual assets.
- Create: `src/question-types/TrueFalseNotGivenQuestion.tsx`.
- Create: `src/question-types/MatchingQuestion.tsx`.
- Create: `src/question-types/MultiSelectQuestion.tsx`.
- Create: `src/question-types/CompletionQuestion.tsx`.
- Create: `src/question-types/DiagramLabelQuestion.tsx`.
- Create: `src/question-types/question-renderer-registry.tsx`.
- Create: `src/question-types/question-renderer-registry.test.tsx`.
- Modify: `src/features/reading/ReadingExam.tsx` — use the renderer registry and group-level assets.
- Modify: `src/features/reading/ReadingExam.test.tsx`.

### Visual evidence/assets

- Create: `src/features/importer/reading/visual-region-linker.ts`.
- Create: `src/features/importer/reading/visual-region-linker.test.ts`.
- Modify: `src/features/importer/pdf/pdf-adapter.ts` — expose page render metadata needed for evidence crops.
- Modify: `src/features/importer/pdf/pdf-adapter.test.ts`.
- Create: `src/features/importer/components/VisualRegionEditor.tsx`.
- Create: `src/features/importer/components/VisualRegionEditor.test.tsx`.

### Protected answer mapping and scoring

- Create: `src/features/importer/answer-key/answer-expression.ts`.
- Create: `src/features/importer/answer-key/answer-expression.test.ts`.
- Create: `src/features/importer/answer-key/map-answer-definitions.ts`.
- Create: `src/features/importer/answer-key/map-answer-definitions.test.ts`.
- Create: `src/scoring/answer-definition.ts`.
- Create: `src/scoring/normalize-answer.ts`.
- Create: `src/scoring/normalize-answer.test.ts`.
- Create: `src/scoring/score-objective-attempt.ts`.
- Create: `src/scoring/score-objective-attempt.test.ts`.
- Modify: `src/test-schema/import-mapper.ts`.
- Modify: `src/test-schema/import-mapper.test.ts`.

### Publication, catalog, and session launch

- Create: `src/tests/test-catalog-repository.ts`.
- Create: `src/tests/supabase-test-catalog-repository.ts`.
- Create: `src/tests/indexeddb-test-catalog-repository.ts`.
- Create: `src/tests/indexeddb-test-catalog-repository.test.ts`.
- Create: `src/features/importer/publication/import-publisher.ts`.
- Create: `src/features/importer/publication/supabase-import-publisher.ts`.
- Create: `src/features/importer/publication/supabase-import-publisher.test.ts`.
- Modify: `src/features/sessions/SessionBuilder.tsx` — select a real published test/version.
- Modify: `src/features/sessions/SessionBuilder.test.tsx`.
- Modify: `src/app/App.tsx` — load selected published test instead of `sampleReadingTest`.
- Modify: `src/app/App.test.tsx`.

### Supabase

- Create: `supabase/migrations/20260918095000_import_bundles.sql`.
- Create: `supabase/migrations/20260918095100_publish_import_bundle.sql`.
- Create: `supabase/migrations/20260918095200_score_objective_attempt.sql`.

### Acceptance fixture

- Add private test fixture from the user-provided file as `tests/fixtures/imports/reading-test-1.pdf` only if the user-provided bytes can be committed to this private repository without redistribution.
- Create: `tests/fixtures/imports/reading-test-1.expected.json` — expected passage/question group/type/answer mapping metadata.
- Create: `src/features/importer/reading/reading-fixture.integration.test.ts`.

---

### Task 1: ImportBundle domain and publication readiness

**Files:**
- Create: `src/features/importer/bundle/types.ts`
- Create: `src/features/importer/bundle/validation.ts`
- Test: `src/features/importer/bundle/validation.test.ts`

**Interfaces:**
- Consumes: existing `SourceDocumentRecord`, `VerificationState`, `NormalizedRect`.
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
  id: string;
  documentId: string;
  role: ImportSourceRole;
  pageRanges: PageRange[];
  requiredForPublication: boolean;
}

export interface ImportBundle {
  id: string;
  testId: string;
  module: ImportModule;
  title: string;
  sourceDocuments: SourceDocumentRecord[];
  assignments: ImportSourceAssignment[];
  structuredDraft: StructuredReadingDraft | null;
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
```

- [ ] **Step 1: Write RED validation tests**

```ts
it('accepts Reading question pages and answer pages from the same PDF', () => {
  const bundle = readingBundle({
    assignments: [
      assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 12 }]),
      assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
    ],
  });

  expect(validateImportBundleSources(bundle)).toEqual({ ok: true });
});

it('rejects overlapping question and answer page roles', () => {
  const bundle = readingBundle({
    assignments: [
      assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 13 }]),
      assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
    ],
  });

  expect(validateImportBundleSources(bundle)).toEqual({
    ok: false,
    errors: ['Page 13 cannot be both QUESTION_MATERIAL and ANSWER_KEY'],
  });
});

it('blocks Reading publication when no answer key is assigned', () => {
  const bundle = readingBundle({
    assignments: [assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 12 }])],
  });

  expect(publicationReadiness(bundle).reasons).toContain(
    'Reading requires an answer key before it can be auto-scored',
  );
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/features/importer/bundle/validation.test.ts --run
```

Expected: FAIL because the bundle domain and validation functions do not exist.

- [ ] **Step 3: Implement minimal domain + validation**

Rules:

- page numbers are 1-based positive integers;
- `startPage <= endPage`;
- page ranges for mutually exclusive semantic roles cannot overlap within one source;
- Reading needs at least one `QUESTION_MATERIAL`;
- Reading auto-scoring needs at least one `ANSWER_KEY`;
- no module inference;
- `SUPPORTING_EVIDENCE` may overlap any role because it does not change semantics.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/bundle/validation.test.ts --run
npm run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/bundle
git commit -m "feat: add import bundle domain"
```

---

### Task 2: IndexedDB persistence for multi-source bundles

**Files:**
- Create: `src/features/importer/local/import-bundle-repository.ts`
- Create: `src/features/importer/local/indexeddb-import-bundle-repository.ts`
- Test: `src/features/importer/local/indexeddb-import-bundle-repository.test.ts`
- Preserve compatibility with: `src/features/importer/local/indexeddb-import-repository.ts`

**Interfaces:**

```ts
export interface ImportBundleRepository {
  loadBundle(id: string): Promise<ImportBundle | null>;
  listBundles(): Promise<ImportBundle[]>;
  saveBundle(bundle: ImportBundle): Promise<void>;
  deleteBundle(id: string): Promise<void>;
}
```

- [ ] **Step 1: Write RED persistence test**

```ts
it('round-trips multiple source documents and page assignments', async () => {
  const repo = new IndexedDbImportBundleRepository('bundle-test-db');
  const bundle = createReadingBundleFixture();

  await repo.saveBundle(bundle);
  const restored = await repo.loadBundle(bundle.id);

  expect(restored).toEqual(bundle);
  expect(new TextDecoder().decode(restored?.sourceDocuments[0].sourceBytes)).toContain('%PDF');
  expect(restored?.assignments).toHaveLength(2);
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/local/indexeddb-import-bundle-repository.test.ts --run
```

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement IndexedDB store**

Use DB name `ielts-import-bundles`, version `1`, store `bundles`, keyPath `id`, index `updatedAtMs`.

Store the original `ArrayBuffer` source bytes directly; do not convert them to object URLs or base64.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/local/indexeddb-import-bundle-repository.test.ts --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/local
git commit -m "feat: persist import bundles locally"
```

---

### Task 3: Manual module, multi-source, and PDF page-role UI

**Files:**
- Modify: `src/features/importer/ImportWorkspace.tsx`
- Modify: `src/features/importer/ImportWorkspaceContainer.tsx`
- Modify: `src/features/importer/import-workspace.css`
- Test: `src/features/importer/ImportWorkspace.test.tsx`
- Test: `src/features/importer/ImportWorkspaceContainer.test.tsx`

**Interfaces:**
- Consumes: `ImportBundleRepository`, `ImportBundle`, existing local file processor.
- Produces UI callbacks:

```ts
interface ImportWorkspaceProps {
  bundle: ImportBundle | null;
  onCreateBundle(module: ImportModule, title: string): void;
  onAddSource(file: File): Promise<void>;
  onAssignSourceRole(input: {
    documentId: string;
    role: ImportSourceRole;
    pageRanges: PageRange[];
  }): void;
  onStructure(): Promise<void>;
  onPublish(): Promise<void>;
}
```

- [ ] **Step 1: Write RED UI test**

```tsx
it('creates a Reading bundle and assigns question/answer pages from one PDF', async () => {
  render(<ImportWorkspaceHarness />);

  await user.click(screen.getByRole('radio', { name: 'Reading' }));
  await user.type(screen.getByLabelText('Test title'), 'Reading Test 1');
  await user.click(screen.getByRole('button', { name: 'Create import' }));

  await user.upload(screen.getByLabelText('Add source file'), pdfFile(13));

  await user.selectOptions(screen.getByLabelText('Role for Reading_Test_1.pdf'), 'QUESTION_MATERIAL');
  await user.clear(screen.getByLabelText('Pages for QUESTION_MATERIAL'));
  await user.type(screen.getByLabelText('Pages for QUESTION_MATERIAL'), '1-12');

  await user.click(screen.getByRole('button', { name: 'Add another role' }));
  await user.selectOptions(screen.getByLabelText('Second role for Reading_Test_1.pdf'), 'ANSWER_KEY');
  await user.type(screen.getByLabelText('Pages for ANSWER_KEY'), '13');

  expect(screen.getByText('Questions: pages 1–12')).toBeInTheDocument();
  expect(screen.getByText('Answer key: page 13')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/ImportWorkspace.test.tsx --run
```

- [ ] **Step 3: Implement the smallest bundle workflow**

UI order:

1. module radio buttons;
2. title;
3. create bundle;
4. add source file(s);
5. source card with role/page-range editor;
6. source validation status;
7. `Structure test` button enabled only when source-role validation passes.

Use a strict page-range parser:

- `1` -> `[{startPage:1,endPage:1}]`
- `1-12` -> `[{startPage:1,endPage:12}]`
- `1-3,5,8-9` -> three ranges
- reject `0`, descending ranges, non-numbers, duplicate pages.

- [ ] **Step 4: Update container persistence**

The container owns the bundle repository and saves after:

- bundle creation;
- source addition;
- role/page change;
- semantic review edits;
- structured draft generation.

- [ ] **Step 5: Run GREEN**

```bash
npm test -- src/features/importer/ImportWorkspace.test.tsx src/features/importer/ImportWorkspaceContainer.test.tsx --run
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/features/importer/ImportWorkspace* src/features/importer/import-workspace.css
git commit -m "feat: add multi-source Reading import workflow"
```

---

### Task 4: Reading outline, passage, and question-range parsing

**Files:**
- Create: `src/features/importer/reading/reading-structure.ts`
- Create: `src/features/importer/reading/document-outline-parser.ts`
- Test: `src/features/importer/reading/document-outline-parser.test.ts`
- Create: `src/features/importer/reading/question-range-parser.ts`
- Test: `src/features/importer/reading/question-range-parser.test.ts`
- Create: `src/features/importer/reading/reading-structure-parser.ts`
- Test: `src/features/importer/reading/reading-structure-parser.test.ts`

**Interfaces:**

```ts
export interface ReadingSourcePage {
  documentId: string;
  pageNumber: number;
  text: string;
  evidence: SourceEvidence[];
}

export interface StructuredReadingDraft {
  module: 'READING';
  title: string;
  sections: StructuredReadingSectionDraft[];
  reviewItems: StructureReviewItem[];
}

export interface StructuredReadingSectionDraft {
  id: string;
  ordinal: number;
  title: string;
  passageText: string[];
  questionGroups: StructuredQuestionGroupDraft[];
}
```

- [ ] **Step 1: Write RED outline tests using real fixture text patterns**

```ts
it('finds three passages and question ranges 1-40', () => {
  const result = parseReadingStructure([
    page(1, 'Passage 1\nThe Layers of the Sun\n...'),
    page(3, 'Questions 1-4\nLabel the diagram below...'),
    page(4, 'Questions 5-9\n...\nQuestions 10-14\n...'),
    page(5, 'Passage 2\nThe Changing Landscape of Oceania\n...'),
    page(6, 'Questions 15-19\n...'),
    page(7, 'Questions 20-24\n...'),
    page(8, 'Questions 25-27\n...'),
    page(9, 'Passage 3\nSpanish Exploration and Conquest\n...'),
    page(11, 'Questions 28-31\n...\nQuestions 32-36\n...'),
    page(12, 'Questions 37-40\n...'),
  ]);

  expect(result.sections.map((section) => section.ordinal)).toEqual([1, 2, 3]);
  expect(result.sections.flatMap((s) => s.questionGroups.map((g) => g.range))).toEqual([
    [1, 4], [5, 9], [10, 14], [15, 19], [20, 24],
    [25, 27], [28, 31], [32, 36], [37, 40],
  ]);
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/document-outline-parser.test.ts src/features/importer/reading/question-range-parser.test.ts src/features/importer/reading/reading-structure-parser.test.ts --run
```

- [ ] **Step 3: Implement deterministic outline rules**

Recognize only explicit markers:

- `Passage <positive integer>`;
- `Questions <n>-<m>`;
- `Section A` / labelled passage paragraphs remain passage content, not module sections;
- text before first question group after a Passage marker belongs to the passage;
- repeated footer/disclaimer lines are deduplicated only when exact normalized text repeats across pages; do not remove unique source content.

If a question range overlaps another or skips numbers within a standard 1–40 fixture, emit a review item.

- [ ] **Step 4: Run GREEN**

```bash
npm test -- src/features/importer/reading --run
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/importer/reading
git commit -m "feat: structure Reading passages and question ranges"
```

---

### Task 5: Instruction constraints and question-type recognition

**Files:**
- Create: `src/features/importer/reading/instruction-parser.ts`
- Test: `src/features/importer/reading/instruction-parser.test.ts`
- Create: `src/features/importer/reading/question-type-recognizer.ts`
- Test: `src/features/importer/reading/question-type-recognizer.test.ts`
- Modify: `src/features/importer/reading/reading-structure.ts`

**Interfaces:**

```ts
export interface InstructionConstraints {
  maxWords?: number;
  numbersAllowed?: boolean;
  optionReuse?: 'ONCE' | 'MULTIPLE';
  requiredSelections?: number;
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
```

- [ ] **Step 1: Write RED recognition tests**

```ts
expect(recognizeQuestionType('Do the following statements agree... True ... False ... Not Given')).toMatchObject({
  type: 'TRUE_FALSE_NOT_GIVEN',
  confidence: 'HIGH',
});

expect(recognizeQuestionType('Choose the correct headings for Sections B-F.')).toMatchObject({
  type: 'MATCHING_HEADINGS',
  confidence: 'HIGH',
});

expect(recognizeQuestionType('Complete the table below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER')).toMatchObject({
  type: 'TABLE_COMPLETION',
  confidence: 'HIGH',
});

expect(parseInstructionConstraints('Choose NO MORE THAN TWO WORDS AND/OR A NUMBER')).toEqual({
  maxWords: 2,
  numbersAllowed: true,
});
```

Include fixture expectations:

- 1–4 `DIAGRAM_LABEL_COMPLETION`
- 5–9 `MATCHING_SENTENCE_ENDINGS`
- 10–14 `TRUE_FALSE_NOT_GIVEN`
- 15–19 `SHORT_ANSWER`
- 20–24 `MATCHING_HEADINGS`
- 25–27 `SINGLE_CHOICE`
- 28–31 `TABLE_COMPLETION`
- 32–36 `MATCHING_INFORMATION`
- 37–40 `MATCHING_FEATURES`

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/instruction-parser.test.ts src/features/importer/reading/question-type-recognizer.test.ts --run
```

- [ ] **Step 3: Implement recognizers**

Use explicit phrases and structure. If two high-confidence recognizers match one group, return `type:null`, `confidence:'LOW'`, reason `Conflicting question-type evidence`.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/features/importer/reading --run
npm run typecheck
git add src/features/importer/reading
git commit -m "feat: recognize Reading question types"
```

---

### Task 6: Expand student schema and renderer registry

**Files:**
- Modify: `src/test-schema/types.ts`
- Create: `src/question-types/TrueFalseNotGivenQuestion.tsx`
- Create: `src/question-types/MatchingQuestion.tsx`
- Create: `src/question-types/MultiSelectQuestion.tsx`
- Create: `src/question-types/CompletionQuestion.tsx`
- Create: `src/question-types/DiagramLabelQuestion.tsx`
- Create: `src/question-types/question-renderer-registry.tsx`
- Test: `src/question-types/question-renderer-registry.test.tsx`
- Modify: `src/features/reading/ReadingExam.tsx`
- Test: `src/features/reading/ReadingExam.test.tsx`
- Modify: `src/exam-engine/create-attempt.ts`

**Interfaces:**

```ts
export interface QuestionBase {
  id: string;
  number: number;
  prompt: string;
  constraints?: InstructionConstraints;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface MatchingQuestion extends QuestionBase {
  type:
    | 'MATCHING_INFORMATION'
    | 'MATCHING_HEADINGS'
    | 'MATCHING_FEATURES'
    | 'MATCHING_SENTENCE_ENDINGS';
  options: ChoiceOption[];
}

export interface CompletionQuestion extends QuestionBase {
  type:
    | 'SHORT_ANSWER'
    | 'SENTENCE_COMPLETION'
    | 'SUMMARY_COMPLETION'
    | 'NOTE_COMPLETION'
    | 'TABLE_COMPLETION'
    | 'FLOW_CHART_COMPLETION';
  placeholder?: string;
}

export interface DiagramLabelQuestion extends QuestionBase {
  type: 'DIAGRAM_LABEL_COMPLETION';
  assetId: string;
  anchor?: NormalizedRect;
}
```

- [ ] **Step 1: Write RED registry tests**

```tsx
it.each([
  'TRUE_FALSE_NOT_GIVEN',
  'MATCHING_HEADINGS',
  'MATCHING_FEATURES',
  'MATCHING_SENTENCE_ENDINGS',
  'SHORT_ANSWER',
  'TABLE_COMPLETION',
  'DIAGRAM_LABEL_COMPLETION',
] as const)('renders %s without falling back to another type', (type) => {
  render(renderStudentQuestion(questionFixture(type), undefined, vi.fn()));
  expect(screen.getByTestId(`question-type-${type}`)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/question-types/question-renderer-registry.test.tsx --run
```

- [ ] **Step 3: Implement registry**

```ts
export function renderStudentQuestion(
  question: StudentQuestion,
  value: AnswerValue | undefined,
  onChange: (value: AnswerValue) => void,
): ReactNode {
  switch (question.type) {
    case 'SINGLE_CHOICE':
      return <SingleChoiceQuestion ... />;
    case 'TRUE_FALSE_NOT_GIVEN':
      return <TrueFalseNotGivenQuestion ... />;
    // every discriminant handled explicitly
    default:
      return assertNever(question);
  }
}
```

No generic fallback.

- [ ] **Step 4: Update ReadingExam**

Replace its current two-type renderer with the registry. Keep timer, review, navigation, and attempt persistence semantics unchanged.

- [ ] **Step 5: Run GREEN**

```bash
npm test -- src/question-types src/features/reading src/exam-engine --run
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/test-schema/types.ts src/question-types src/features/reading/ReadingExam* src/exam-engine/create-attempt.ts
git commit -m "feat: render full Reading question type set"
```

---

### Task 7: Visual asset preservation and review

**Files:**
- Create: `src/features/importer/reading/visual-region-linker.ts`
- Test: `src/features/importer/reading/visual-region-linker.test.ts`
- Modify: `src/features/importer/pdf/pdf-adapter.ts`
- Test: `src/features/importer/pdf/pdf-adapter.test.ts`
- Create: `src/features/importer/components/VisualRegionEditor.tsx`
- Test: `src/features/importer/components/VisualRegionEditor.test.tsx`
- Modify: `src/features/importer/ImportWorkspace.tsx`

**Interfaces:**

```ts
export interface ImportedVisualAssetDraft {
  id: string;
  documentId: string;
  pageNumber: number;
  crop: NormalizedRect;
  mediaType: 'image/png';
  bytes: ArrayBuffer;
  verificationState: VerificationState;
}

export interface VisualRegionCandidate {
  crop: NormalizedRect | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}
```

- [ ] **Step 1: Write RED tests**

```ts
it('requires review instead of inventing a diagram crop when no reliable region exists', () => {
  expect(linkVisualRegion(diagramGroup(), pageEvidenceWithoutImageBounds())).toEqual({
    crop: null,
    confidence: 'LOW',
    reasons: ['No reliable diagram region was found on source page 3'],
  });
});

it('accepts an explicit reviewer crop and marks it CONFIRMED', async () => {
  render(<VisualRegionEditor pageImage={page3} initialCrop={null} onConfirm={onConfirm} />);
  await user.drag(...);
  await user.click(screen.getByRole('button', { name: 'Confirm visual region' }));
  expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ verificationState: 'CONFIRMED' }));
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/visual-region-linker.test.ts src/features/importer/components/VisualRegionEditor.test.tsx --run
```

- [ ] **Step 3: Extend PDF adapter**

Keep text extraction unchanged. Add a function:

```ts
export async function renderPdfPageForEvidence(
  data: ArrayBuffer,
  pageNumber: number,
  scale = 2,
): Promise<{ image: Blob; width: number; height: number }>;
```

This uses local PDF.js worker only.

- [ ] **Step 4: Implement conservative linker + manual editor**

Automatic candidate only when source evidence yields a single unambiguous visual region. Otherwise review is required.

For the supplied fixture, Q1–4 must retain a page-3 visual asset. A full-page evidence image is acceptable before human crop confirmation; it is not acceptable as `VERIFIED` automatically.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/features/importer/reading/visual-region-linker.test.ts src/features/importer/components/VisualRegionEditor.test.tsx src/features/importer/pdf/pdf-adapter.test.ts --run
npm run typecheck
git add src/features/importer/reading src/features/importer/components src/features/importer/pdf
git commit -m "feat: preserve Reading visual question assets"
```

---

### Task 8: Answer shorthand expansion, mapping, and answer coverage gate

**Files:**
- Create: `src/scoring/answer-definition.ts`
- Create: `src/features/importer/answer-key/answer-expression.ts`
- Test: `src/features/importer/answer-key/answer-expression.test.ts`
- Create: `src/features/importer/answer-key/map-answer-definitions.ts`
- Test: `src/features/importer/answer-key/map-answer-definitions.test.ts`

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

export type AnswerDefinition =
  | {
      kind: 'TEXT';
      questionId: string;
      accepted: string[];
      policy: AnswerNormalizationPolicy;
    }
  | {
      kind: 'OPTION';
      questionId: string;
      acceptedOptionIds: string[];
      policy: AnswerNormalizationPolicy;
    }
  | {
      kind: 'ENUM';
      questionId: string;
      accepted: Array<'TRUE' | 'FALSE' | 'NOT_GIVEN' | 'YES' | 'NO'>;
      policy: AnswerNormalizationPolicy;
    };
```

- [ ] **Step 1: Write RED shorthand tests**

```ts
expect(expandAnswerExpression('(The) corona')).toEqual({
  state: 'VERIFIED',
  accepted: ['corona', 'the corona'],
});

expect(expandAnswerExpression('(around) six/6 years')).toEqual({
  state: 'VERIFIED',
  accepted: ['six years', '6 years', 'around six years', 'around 6 years'],
});

expect(expandAnswerExpression('ninety/90 percent/per cent/%')).toMatchObject({
  state: 'REVIEW_REQUIRED',
});
```

The last expression is intentionally reviewed because slash semantics can be ambiguous without explicit grouping.

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/answer-key/answer-expression.test.ts --run
```

- [ ] **Step 3: Implement conservative expansion**

Rules:

- one parenthesized optional token/group may expand present/absent;
- simple numeric word/digit slash inside one token may expand both;
- multiple independent slash groups in one raw answer require review unless syntax is unambiguous;
- preserve supplied source evidence on every definition.

- [ ] **Step 4: Write RED mapping tests**

```ts
it('maps all supplied answers 1-40 by question number', () => {
  const mapped = mapAnswerDefinitions(structured40Questions, parsedAnswerKey40);
  expect(mapped.definitions).toHaveLength(40);
  expect(mapped.unmappedQuestionNumbers).toEqual([]);
  expect(mapped.duplicateQuestionNumbers).toEqual([]);
});

it('blocks publication when one answer is missing', () => {
  const mapped = mapAnswerDefinitions(structured40Questions, parsedAnswerKey40.slice(0, 39));
  expect(mapped.publicationReady).toBe(false);
  expect(mapped.unmappedQuestionNumbers).toEqual([40]);
});
```

- [ ] **Step 5: Implement mapping + coverage gate**

Question number is import-time key. Replace with immutable `questionId` inside each final `AnswerDefinition`.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm test -- src/features/importer/answer-key --run
npm run typecheck
git add src/features/importer/answer-key src/scoring/answer-definition.ts
git commit -m "feat: map protected Reading answer definitions"
```

---

### Task 9: Build the student-safe Reading package

**Files:**
- Modify: `src/test-schema/import-mapper.ts`
- Test: `src/test-schema/import-mapper.test.ts`
- Create: `src/features/importer/reading/build-reading-package.ts`
- Test: `src/features/importer/reading/build-reading-package.test.ts`

**Interfaces:**

```ts
export interface BuiltReadingPublication {
  studentPackage: StudentTestPackage;
  protectedAnswers: Readonly<Record<string, AnswerDefinition>>;
  reviewItems: StructureReviewItem[];
}
```

- [ ] **Step 1: Write RED package test**

```ts
it('builds a 40-question student package without protected answers', () => {
  const result = buildReadingPublication(verifiedReadingDraft());

  expect(result.studentPackage.modules[0].sections).toHaveLength(3);
  expect(questionIds(result.studentPackage)).toHaveLength(40);
  expect(JSON.stringify(result.studentPackage)).not.toContain('accepted');
  expect(JSON.stringify(result.studentPackage)).not.toContain('correctAnswer');
  expect(Object.keys(result.protectedAnswers)).toHaveLength(40);
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/build-reading-package.test.ts src/test-schema/import-mapper.test.ts --run
```

- [ ] **Step 3: Implement package builder**

Publication remains blocked if:

- any critical structure review item is unresolved;
- any question number is missing/duplicated;
- answer coverage is incomplete;
- a visual-required group has no confirmed asset;
- student JSON contains protected-key names.

- [ ] **Step 4: Add local student preview**

Use the built `studentPackage` with the actual `ReadingExam` in a preview route/state. Preview must use dummy/local attempt persistence and must not expose the protected answers to the renderer.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/features/importer/reading/build-reading-package.test.ts src/test-schema/import-mapper.test.ts src/features/reading --run
npm run typecheck
git add src/features/importer/reading src/test-schema
git commit -m "feat: build student-safe Reading packages"
```

---

### Task 10: Supabase import-bundle persistence and atomic publication

**Files:**
- Create: `supabase/migrations/20260918095000_import_bundles.sql`
- Create: `supabase/migrations/20260918095100_publish_import_bundle.sql`
- Create: `src/features/importer/publication/import-publisher.ts`
- Create: `src/features/importer/publication/supabase-import-publisher.ts`
- Test: `src/features/importer/publication/supabase-import-publisher.test.ts`

**Interfaces:**

```ts
export interface ImportPublisher {
  readonly profile: 'LOCAL_OFFLINE' | 'CLOUD_SECURE';

  publish(input: {
    bundleId: string;
    title: string;
    studentPackage: StudentTestPackage;
    protectedAnswers: Readonly<Record<string, AnswerDefinition>>;
    verificationRecords: PublicationVerificationRecord[];
  }): Promise<{ testId: string; versionId: string; versionNumber: number }>;
}
```

- [ ] **Step 1: Add import bundle tables**

Migration `20260918095000_import_bundles.sql`:

```sql
create type public.import_module as enum ('READING', 'LISTENING', 'WRITING');
create type public.import_source_role as enum (
  'QUESTION_MATERIAL',
  'ANSWER_KEY',
  'AUDIO',
  'WRITING_PROMPT',
  'STAFF_MARKING_GUIDE',
  'SUPPORTING_EVIDENCE'
);

create table public.import_bundles (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  module public.import_module not null,
  title text not null check (char_length(title) between 1 and 200),
  status text not null check (status in (
    'COLLECTING_SOURCES','EXTRACTING','STRUCTURING','REVIEW_REQUIRED',
    'READY_TO_PREVIEW','READY_TO_PUBLISH','PUBLISHED'
  )),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_source_assignments (
  id uuid primary key default gen_random_uuid(),
  import_bundle_id uuid not null references public.import_bundles(id) on delete cascade,
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  role public.import_source_role not null,
  page_ranges jsonb not null default '[]'::jsonb,
  required_for_publication boolean not null default true
);
```

Enable RLS. Staff can CRUD their institute-visible importer data; students have no access. Reuse `private.current_user_role()`.

- [ ] **Step 2: Add local/offline publisher**

`LocalImportPublisher` writes the immutable student package into the IndexedDB test catalog and writes protected answers into a separate local protected-answer store. Its `profile` is `LOCAL_OFFLINE`.

The Import UI must display this exact warning before first local publication:

```text
Local/offline scoring stores answer definitions on this device. It is suitable for personal/offline use but does not provide the same answer secrecy as cloud-secure scoring.
```

This path makes the current hosted preview usable before authentication/admin UI is implemented, while preserving the already-approved offline-scoring trade-off.

- [ ] **Step 3: Add atomic cloud publication RPC**

Migration `20260918095100_publish_import_bundle.sql` creates an exposed entry point:

```sql
create or replace function public.publish_import_bundle(
  p_bundle_id uuid,
  p_student_content jsonb,
  p_answer_definitions jsonb,
  p_verification_records jsonb
)
returns table(test_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $
-- function body
$;

revoke all on function public.publish_import_bundle(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.publish_import_bundle(uuid, jsonb, jsonb, jsonb) from anon;
grant execute on function public.publish_import_bundle(uuid, jsonb, jsonb, jsonb) to authenticated;
```

The exposed function may call private helper functions, but the browser-facing RPC itself must live in the exposed `public` schema.

Behavior in one transaction/function call:

1. require caller role admin/teacher;
2. lock bundle row;
3. reject status other than `READY_TO_PUBLISH`;
4. create or reuse draft `tests` row;
5. compute next version number under lock;
6. insert student-safe `test_versions.content`;
7. insert verification records;
8. reject unresolved critical records;
9. insert protected `answer_definitions`;
10. set `published_at`;
11. set test status `published`;
12. set bundle status `PUBLISHED`;
13. return IDs.

The existing publication guard remains active.

- [ ] **Step 4: Write RED publisher tests**

Cover both profiles:

```ts
it('publishes locally without Supabase', async () => {
  const publisher = new LocalImportPublisher(localCatalog, localProtectedAnswers);
  const result = await publisher.publish(publicationInput());

  expect(publisher.profile).toBe('LOCAL_OFFLINE');
  expect(await localCatalog.loadPublishedTest(result.testId, result.versionId)).toBeTruthy();
  expect(await localProtectedAnswers.load(result.versionId)).toHaveLength(40);
});

it('publishes cloud-secure content only through the atomic RPC', async () => {
  const client = fakeSupabase();
  const publisher = new SupabaseImportPublisher(client);

  await publisher.publish(publicationInput());

  expect(client.rpc).toHaveBeenCalledWith(
    'publish_import_bundle',
    expect.objectContaining({
      p_bundle_id: expect.any(String),
      p_student_content: expect.any(Object),
      p_answer_definitions: expect.any(Object),
    }),
  );
});
```

- [ ] **Step 5: Implement publishers and run GREEN**

```bash
npm test -- src/features/importer/publication/supabase-import-publisher.test.ts --run
npm run typecheck
```

- [ ] **Step 6: Apply migrations to the existing Supabase project**

Before applying, call `list_migrations` and confirm the exact version numbers are unused.

Apply one migration at a time. After each:

- inspect schema;
- run Supabase security advisor;
- stop on any ERROR/WARN security lint introduced by the migration.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260918095000_import_bundles.sql supabase/migrations/20260918095100_publish_import_bundle.sql src/features/importer/publication
git commit -m "feat: publish verified import bundles atomically"
```

---

### Task 11: Protected objective scoring and result integration

**Files:**
- Create: `src/scoring/normalize-answer.ts`
- Test: `src/scoring/normalize-answer.test.ts`
- Create: `src/scoring/score-objective-attempt.ts`
- Test: `src/scoring/score-objective-attempt.test.ts`
- Create: `supabase/migrations/20260918095200_score_objective_attempt.sql`
- Modify: `src/session/results.ts`
- Test: `src/session/results.test.ts`
- Modify: `src/features/results/SessionResult.tsx`
- Test: `src/features/results/SessionResult.test.tsx`

**Interfaces:**

```ts
export interface QuestionScore {
  questionId: string;
  correct: boolean;
  invalidByInstruction: boolean;
}

export interface ObjectiveScore {
  rawScore: number;
  totalQuestions: number;
  questions: QuestionScore[];
}
```

- [ ] **Step 1: Write RED normalization tests**

```ts
it('accepts case and whitespace variants when policy allows', () => {
  expect(scoreAnswer(' The   Corona ', textAnswer(['corona', 'the corona']))).toBe(true);
});

it('rejects an answer exceeding a two-word limit', () => {
  expect(scoreAnswer('the bright corona', textAnswer(['the corona'], { maxWords: 2 }))).toBe(false);
});

it('matches option IDs exactly', () => {
  expect(scoreAnswer('C', optionAnswer(['C']))).toBe(true);
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/scoring --run
```

- [ ] **Step 3: Implement pure scoring domain**

No generative similarity. No web calls. Deterministic normalization only.

- [ ] **Step 4: Add server-side scoring RPC**

Create the exposed RPC as `public.score_objective_attempt(p_attempt_id uuid)` with `SECURITY DEFINER`, `set search_path = ''`, revoke from `public` and `anon`, and grant execute only to `authenticated`. Private helpers may remain in the `private` schema.

Behavior:

- authorize attempt owner or staff;
- require submitted attempt;
- load protected definitions by `attempts.test_version_id`;
- load attempt responses;
- score server-side;
- return raw score/total and per-question correctness;
- never return full answer definitions to a student.

If persistent score tables are added, keep them separate from protected definitions and add RLS for own-result/staff access.

- [ ] **Step 5: Update result domain/UI**

For Reading result:

```ts
{
  module: 'READING',
  rawScore: 32,
  totalQuestions: 40,
  band: undefined
}
```

Do not invent a band conversion in this task. Band conversion tables require a separately verified policy/source.

- [ ] **Step 6: Run GREEN**

```bash
npm test -- src/scoring src/session/results.test.ts src/features/results/SessionResult.test.tsx --run
npm run typecheck
```

- [ ] **Step 7: Apply migration + security advisor**

Apply `20260918095200_score_objective_attempt.sql`, then run Supabase security advisor. Any new security lint is a blocker.

- [ ] **Step 8: Commit**

```bash
git add src/scoring src/session/results* src/features/results/SessionResult* supabase/migrations/20260918095200_score_objective_attempt.sql
git commit -m "feat: score protected Reading answers"
```

---

### Task 12: Published test catalog and real SessionBuilder launch

**Files:**
- Create: `src/tests/test-catalog-repository.ts`
- Create: `src/tests/indexeddb-test-catalog-repository.ts`
- Test: `src/tests/indexeddb-test-catalog-repository.test.ts`
- Create: `src/tests/supabase-test-catalog-repository.ts`
- Modify: `src/features/sessions/SessionBuilder.tsx`
- Test: `src/features/sessions/SessionBuilder.test.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**

```ts
export interface TestSummary {
  testId: string;
  versionId: string;
  title: string;
  modules: SessionModule[];
  versionNumber: number;
}

export interface TestCatalogRepository {
  listPublishedTests(): Promise<TestSummary[]>;
  loadPublishedTest(testId: string, versionId: string): Promise<StudentTestPackage>;
}
```

- [ ] **Step 1: Write RED SessionBuilder test**

```tsx
it('creates a session for the selected published imported test', async () => {
  render(
    <SessionBuilder
      tests={[
        {
          testId: 'imported-reading',
          versionId: 'v1',
          title: 'Reading Test 1',
          modules: ['READING'],
          versionNumber: 1,
        },
      ]}
      nowMs={1000}
      onCreate={onCreate}
    />,
  );

  await user.selectOptions(screen.getByLabelText('Published test'), 'imported-reading:v1');
  await user.click(screen.getByLabelText('Reading'));
  await user.click(screen.getByRole('button', { name: 'Create session' }));

  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      testId: 'imported-reading',
      testVersionId: 'v1',
      modules: ['READING'],
    }),
  );
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/sessions/SessionBuilder.test.tsx src/app/App.test.tsx --run
```

- [ ] **Step 3: Implement local + Supabase catalog adapters**

Supabase catalog query reads only:

- published tests;
- published immutable test versions;
- `content` student-safe package.

It never selects `answer_definitions`.

- [ ] **Step 4: Remove production hard-code**

In `App.tsx`:

- keep `sampleReadingTest` only as a development/test fixture if tests need it;
- production session creation must load the selected `testId/versionId`;
- pass that loaded package to `ExamProvider` and `ReadingExam`.

- [ ] **Step 5: Run GREEN**

```bash
npm test -- src/tests src/features/sessions src/app --run
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/tests src/features/sessions/SessionBuilder* src/app/App*
git commit -m "feat: launch published imported Reading tests"
```

---

### Task 13: Wire publication into the Import workspace

**Files:**
- Modify: `src/features/importer/ImportWorkspace.tsx`
- Modify: `src/features/importer/ImportWorkspaceContainer.tsx`
- Test: `src/features/importer/ImportWorkspaceContainer.test.tsx`

**Interfaces:**
- Consumes: `buildReadingPublication()`, `ImportPublisher`, `ImportBundleRepository`.
- Produces: published IDs and refreshed catalog state.

- [ ] **Step 1: Write RED publish-flow test**

```tsx
it('publishes a ready Reading bundle and reports its immutable version', async () => {
  const publisher = fakePublisher({
    testId: 'test-1',
    versionId: 'version-1',
    versionNumber: 1,
  });

  render(<ImportWorkspaceContainer repository={readyBundleRepo()} publisher={publisher} />);

  await user.click(screen.getByRole('button', { name: 'Publish imported test' }));

  expect(publisher.publish).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Published as version 1')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/ImportWorkspaceContainer.test.tsx --run
```

- [ ] **Step 3: Implement publish state**

Publisher selection:

- when an authenticated `CLOUD_SECURE` publisher is available, make it the default;
- otherwise allow `LOCAL_OFFLINE` publication with the explicit answer-secrecy warning;
- never label local/offline publication as cloud-secure.

Button states:

- disabled while unresolved critical review items exist;
- disabled while answer coverage incomplete;
- disabled while required visual asset unresolved;
- `Publishing…` during request;
- success shows test/version and link/action to create session;
- failure leaves local draft intact and shows actionable error.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/features/importer/ImportWorkspaceContainer.test.tsx src/features/importer/ImportWorkspace.test.tsx --run
npm run typecheck
git add src/features/importer
git commit -m "feat: publish Reading imports from review workspace"
```

---

### Task 14: Full supplied-PDF acceptance fixture

**Files:**
- Add: `tests/fixtures/imports/reading-test-1.pdf` if the user-provided PDF is intentionally retained in the private repo.
- Create: `tests/fixtures/imports/reading-test-1.expected.json`
- Create: `src/features/importer/reading/reading-fixture.integration.test.ts`

**Expected fixture metadata:**

```json
{
  "module": "READING",
  "passages": 3,
  "questions": 40,
  "groups": [
    {"from":1,"to":4,"type":"DIAGRAM_LABEL_COMPLETION"},
    {"from":5,"to":9,"type":"MATCHING_SENTENCE_ENDINGS"},
    {"from":10,"to":14,"type":"TRUE_FALSE_NOT_GIVEN"},
    {"from":15,"to":19,"type":"SHORT_ANSWER"},
    {"from":20,"to":24,"type":"MATCHING_HEADINGS"},
    {"from":25,"to":27,"type":"SINGLE_CHOICE"},
    {"from":28,"to":31,"type":"TABLE_COMPLETION"},
    {"from":32,"to":36,"type":"MATCHING_INFORMATION"},
    {"from":37,"to":40,"type":"MATCHING_FEATURES"}
  ],
  "questionPages":[1,2,3,4,5,6,7,8,9,10,11,12],
  "answerPages":[13]
}
```

- [ ] **Step 1: Write RED end-to-end importer test**

```ts
it('converts the supplied Reading PDF into a 40-question publishable package', async () => {
  const pdf = await readFixturePdf('reading-test-1.pdf');

  const bundle = await importReadingFixture(pdf, {
    questionPages: range(1, 12),
    answerPages: [13],
    confirmedVisualCrops: fixtureVisualCrops(),
  });

  const built = await structureAndBuild(bundle);

  expect(built.studentPackage.modules[0].sections).toHaveLength(3);
  expect(questionIds(built.studentPackage)).toHaveLength(40);
  expect(groupTypeSummary(built.studentPackage)).toEqual(expected.groups);
  expect(Object.keys(built.protectedAnswers)).toHaveLength(40);
  expect(JSON.stringify(built.studentPackage)).not.toContain('protectedAnswers');
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- src/features/importer/reading/reading-fixture.integration.test.ts --run
```

- [ ] **Step 3: Fix only fixture-exposed parser gaps**

For every failure:

1. inspect exact source page/evidence;
2. add a focused RED unit test;
3. implement the minimal deterministic parser fix;
4. rerun focused test;
5. rerun fixture integration test.

Do not add filename-specific or test-title-specific rules.

- [ ] **Step 4: Verify scoring against the supplied page-13 key**

Create a 40-response perfect attempt using the mapped accepted forms and assert:

```ts
expect(score.rawScore).toBe(40);
expect(score.totalQuestions).toBe(40);
```

Create at least one intentionally wrong response and assert the raw score decreases exactly by one.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/imports src/features/importer/reading
git commit -m "test: cover full Reading import fixture"
```

---

### Task 15: Final regression, security, and deployment verification

**Files:** no new production files unless verification reveals a defect.

- [ ] **Step 1: Run the complete local/CI-equivalent suite**

```bash
npm install --no-audit --no-fund
npm run typecheck
npm test -- --run
npm run build
```

Expected:

- install exits 0;
- typecheck exits 0;
- all Vitest tests pass;
- production build exits 0;
- postbuild OCR asset verification exits 0.

- [ ] **Step 2: Inspect student payload leakage**

Serialize the fixture publication and recursively reject protected keys:

```text
correctAnswer
correctAnswers
answerKey
answerKeys
answerDefinitions
protectedAnswers
accepted
acceptedOptionIds
```

Any protected answer material in student JSON is a release blocker.

- [ ] **Step 3: Run Supabase advisors**

Run:

- security advisor;
- performance advisor.

Security advisor must have zero lints introduced by this work.

Performance INFO notices for unused indexes may be documented on an empty/new database but must not be treated as security failures.

- [ ] **Step 4: Verify database migration history**

Compare live `list_migrations` with all committed migration files. No live migration may be absent from Git, and no committed migration may be silently skipped.

- [ ] **Step 5: Fresh branch comparison**

Compare implementation branch against current `main`:

- branch must be 0 commits behind before final PR, or rebase/merge current main safely;
- diff must be confined to importer, question schema/renderers, scoring, test catalog/session launch, Supabase migrations, tests, and directly related docs.

- [ ] **Step 6: Open PR, do not merge automatically until checks pass**

PR summary must explicitly state:

- Reading import bundle is implemented;
- module selection is manual;
- supplied PDF fixture produces 3 passages / 40 questions;
- page 13 remains protected answer source;
- no protected answer definitions are in student payloads;
- physical Windows 7 smoke test remains required before claiming real Win7 runtime validation.

- [ ] **Step 7: After PR checks are green, merge through GitHub**

Use GitHub-generated merge/squash commit so Netlify private-repo deployment uses the established trusted production path.

- [ ] **Step 8: Verify Netlify production**

Verify the new current Netlify deploy:

- state `ready`;
- context `production`;
- branch `main`;
- commit_ref equals the merge commit;
- no `error_message`.

Then open the public production URL and manually verify:

1. Import → Reading;
2. add supplied PDF;
3. assign pages 1–12 questions, page 13 answers;
4. structure and resolve review items;
5. preview;
6. publish;
7. select published test in Sessions;
8. start Reading;
9. answer/submit;
10. result shows raw score.

---

## Follow-up plans after this Reading vertical slice

These are intentionally not mixed into this plan:

1. **Listening import + audio player completion** — question source + audio + answer key, mock/practice audio restrictions, protected scoring.
2. **Writing import + computer/paper player** — Task 1/2 prompts, visual assets, autosave, teacher marking.
3. **Public URL import + external internet evidence** — safe server-side URL fetch, SSRF/redirect/content controls, evidence provider, web comparison that never overrides supplied keys.
4. **PWA + desktop packaging** — service worker, local package storage, Electron modern/Win7 profiles.

The internet-evidence work remains in the approved architecture, but it follows the deterministic Reading converter so web evidence cannot become a hidden dependency for core import or scoring.
