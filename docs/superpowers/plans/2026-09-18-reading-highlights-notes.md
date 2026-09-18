# Reading Highlighting and Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent passage text highlighting and passage/selection notes to the existing Reading player without coupling exam state to DOM or import internals.

**Architecture:** Store semantic passage annotations in `ExamAttemptState` using passage ID, paragraph index and character offsets. The Reading UI captures a browser selection, converts it to semantic offsets, dispatches domain actions, and renders annotated paragraph segments deterministically. IndexedDB persistence requires no new storage format because the complete attempt state is already stored.

**Tech Stack:** React 19, TypeScript 7, Vitest, Testing Library, IndexedDB/idb.

**Spec:** `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`

## Global Constraints

- Notes/highlights must persist in the attempt state and survive refresh.
- The feature must not depend on source PDFs/OCR after publication.
- No annotation changes after submission.
- Existing answer/review/navigation/timing behavior must remain unchanged.
- Mobile layout must remain usable.
- Windows 7 browser target remains Firefox ESR 115 with Chrome/Edge 109 best-effort.

---

### Task 1: Annotation domain state

**Files:**
- Modify: `src/exam-engine/types.ts`
- Modify: `src/exam-engine/create-attempt.ts`
- Modify: `src/exam-engine/reducer.ts`
- Test: `src/exam-engine/reducer.test.ts`

**Produces:**
- `PassageTextRange`
- `PassageHighlight`
- `PassageNote`
- `ADD_HIGHLIGHT`, `REMOVE_HIGHLIGHT`, `UPSERT_NOTE`, `DELETE_NOTE`

- [ ] Write failing reducer tests for adding/removing highlights and upserting/deleting notes.
- [ ] Verify RED with the existing test workflow.
- [ ] Add empty annotation collections in `createAttempt`.
- [ ] Implement immutable reducer actions.
- [ ] Verify reducer tests and typecheck.

### Task 2: Deterministic annotation rendering helpers

**Files:**
- Create: `src/features/reading/passage-annotations.ts`
- Create: `src/features/reading/passage-annotations.test.ts`

**Produces:**
- `segmentsForParagraph(text, highlights)`
- `normalizePassageRange(range, paragraphLength)`
- overlap-safe rendering segments without changing stored text.

- [ ] Write tests for plain text, one range, multiple non-overlapping ranges and overlapping ranges.
- [ ] Verify RED.
- [ ] Implement deterministic segmentation.
- [ ] Verify GREEN.

### Task 3: Selection capture and Reading tools UI

**Files:**
- Create: `src/features/reading/PassageTools.tsx`
- Create: `src/features/reading/PassageTools.test.tsx`
- Modify: `src/features/reading/ReadingExam.tsx`
- Modify: `src/app/styles.css`

**Behavior:**
- mouse/touch selection inside one passage paragraph becomes a semantic selection;
- Highlight selection adds a highlight;
- Add note opens an inline textarea using the captured quote;
- Notes panel lists passage notes and supports delete;
- clicking a rendered highlight can remove it;
- controls are disabled after submission.

- [ ] Write RED component tests for selection action availability, highlight dispatch, note confirmation and note deletion.
- [ ] Implement selection-to-offset capture with paragraph `data-paragraph-index` markers.
- [ ] Render highlights using Task 2 helpers.
- [ ] Add compact toolbar and notes panel styles.
- [ ] Verify Reading UI tests and typecheck.

### Task 4: Persistence / restore regression

**Files:**
- Modify: `src/storage/indexeddb-attempt-repository.test.ts`
- Modify: `src/features/reading/ReadingExam.test.tsx`

- [ ] Add a test that round-trips annotations through IndexedDB.
- [ ] Add a Reading restore test proving a saved highlight/note reappears.
- [ ] Verify full tests.

### Task 5: Completion gate

- [ ] Run full CI-equivalent: typecheck, all tests, build.
- [ ] Update `docs/IMPLEMENTATION_STATUS.md` to mark Reading highlighting/notes complete.
- [ ] Open PR and merge only when green.
- [ ] Verify Netlify production commit matches merged `main`.
