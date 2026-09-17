# Foundation + Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production slice of the IELTS practice platform: shared application shell, deterministic exam engine, Windows 7-compatible frontend build, local-first persistence, Reading test player, and Supabase-ready data boundaries.

**Architecture:** A framework-light TypeScript domain engine owns exam state and timing. React renders that state through reusable exam components. Persistence is adapter-based so the same engine can run in the website/PWA and future desktop `.exe`, with IndexedDB used locally and Supabase added as the remote sync/backend boundary. The build explicitly targets Chrome 109, Edge 109, and Firefox 115 for Windows 7 compatibility.

**Tech Stack:** React 19.3, TypeScript, Vite 8, Vitest 5, Testing Library, IndexedDB, Supabase JS v2, CSS, later Playwright/Electron.

**Spec:** `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`

## Global Constraints

- Production browser target must include Chrome 109, Edge 109, and Firefox 115.
- Website, future PWA, modern Windows `.exe`, and Windows 7 `.exe` share one exam engine and test schema.
- Windows 7 must not receive intentionally reduced product features.
- Test Player must never depend directly on PDF/OCR/import formats.
- Correct answer definitions must not be bundled into normal student test payloads.
- Published test versions are immutable for active/completed attempts.
- Timers are centralized and reconstructed from persisted timestamps/state.
- Student answer edits are local-first and must survive refresh/network interruption.
- No production code is added without a failing test first, except generated/configuration files.
- Original IELTS branding/assets are not copied.

---

## File Structure

```text
package.json                         dependencies/scripts
vite.config.ts                      Vite + Windows 7-compatible target
vitest.config.ts                    unit/component test config
tsconfig.json                       TypeScript project settings
index.html                          application entry document
src/main.tsx                        React bootstrap
src/app/App.tsx                     top-level routing/mode shell
src/app/styles.css                  global visual system
src/test-schema/types.ts            universal Reading-focused schema
src/exam-engine/types.ts            engine state/action types
src/exam-engine/createSession.ts    initial session construction
src/exam-engine/reducer.ts          deterministic state transitions
src/exam-engine/timing.ts           timestamp-based timer math
src/exam-engine/selectors.ts        derived state helpers
src/persistence/AttemptStore.ts     persistence interface
src/persistence/IndexedDbStore.ts   local browser implementation
src/features/reading/ReadingPlayer.tsx
src/features/reading/ReadingPassagePane.tsx
src/features/reading/ReadingQuestionPane.tsx
src/features/exam/ExamHeader.tsx
src/features/exam/QuestionNavigator.tsx
src/question-types/registry.tsx
src/question-types/SingleChoiceQuestion.tsx
src/question-types/TextAnswerQuestion.tsx
src/sample-data/readingSample.ts    non-copyrighted synthetic fixture
src/database/supabaseClient.ts      optional remote client boundary
src/shared/env.ts                   validated public environment values
tests/unit/exam-engine/*.test.ts
tests/unit/test-schema/*.test.ts
tests/component/reading/*.test.tsx
tests/component/exam/*.test.tsx
```

---

### Task 1: Project scaffold and browser compatibility

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/styles.css`

**Interfaces:**
- Produces: runnable React application, `npm run build`, `npm test`, Windows 7-compatible production target.

- [ ] **Step 1:** Create scaffold/config files with React 19.3, Vite 8, TypeScript, Vitest 5, Testing Library, `@supabase/supabase-js`, and `fake-indexeddb` dev support.
- [ ] **Step 2:** Configure `vite.config.ts` with `build.target: ['chrome109','edge109','firefox115']` and `cssTarget` matching the same compatibility floor.
- [ ] **Step 3:** Add minimal `App` placeholder and global CSS reset.
- [ ] **Step 4:** Run `npm install`.
- [ ] **Step 5:** Run `npm run build`; expected: successful production bundle.
- [ ] **Step 6:** Commit: `chore: scaffold React exam platform`.

### Task 2: Universal Reading schema

**Files:**
- Create: `src/test-schema/types.ts`
- Create: `src/test-schema/validateTest.ts`
- Test: `tests/unit/test-schema/validateTest.test.ts`

**Interfaces:**
- Produces: `ReadingTest`, `ReadingSection`, `Passage`, `QuestionGroup`, `Question`, `QuestionType`, `validateReadingTest(test): ValidationIssue[]`.

- [ ] **Step 1: Write failing test** asserting duplicate question numbers, invalid section ranges, and missing passage references are rejected.
- [ ] **Step 2: Run test** with `npm test -- tests/unit/test-schema/validateTest.test.ts`; expected: FAIL because validator does not exist.
- [ ] **Step 3: Implement minimal schema and validator** covering the tested invariants.
- [ ] **Step 4: Run test**; expected: PASS.
- [ ] **Step 5: Commit:** `feat: add universal reading test schema`.

### Task 3: Deterministic exam session engine

**Files:**
- Create: `src/exam-engine/types.ts`
- Create: `src/exam-engine/createSession.ts`
- Create: `src/exam-engine/reducer.ts`
- Create: `src/exam-engine/selectors.ts`
- Test: `tests/unit/exam-engine/reducer.test.ts`

**Interfaces:**
- Produces: `ExamSessionState`, `ExamAction`, `createSession(...)`, `examReducer(state, action)`, `selectQuestionStatus(...)`.

- [ ] **Step 1: Write failing tests** for answer update, review flag toggle, question navigation, visited-state tracking, and submission locking.
- [ ] **Step 2: Run tests**; expected: FAIL because engine does not exist.
- [ ] **Step 3: Implement minimal reducer/state** needed to satisfy tests.
- [ ] **Step 4: Run tests**; expected: PASS.
- [ ] **Step 5: Refactor only after green** to keep reducer pure and serializable.
- [ ] **Step 6: Commit:** `feat: add deterministic exam session engine`.

### Task 4: Timestamp-based timer model

**Files:**
- Create: `src/exam-engine/timing.ts`
- Modify: `src/exam-engine/types.ts`
- Modify: `src/exam-engine/reducer.ts`
- Test: `tests/unit/exam-engine/timing.test.ts`

**Interfaces:**
- Produces: `remainingMs(session, nowMs)`, `deriveTimedState(session, nowMs)`, `startExam(...)`.

- [ ] **Step 1: Write failing tests** for 60-minute start, refresh reconstruction from timestamps, zero-floor behavior, and expiry transition.
- [ ] **Step 2: Run tests**; expected: FAIL.
- [ ] **Step 3: Implement timestamp-based timing** without decrementing the source-of-truth counter.
- [ ] **Step 4: Run tests**; expected: PASS.
- [ ] **Step 5: Commit:** `feat: add resilient exam timer model`.

### Task 5: Local-first attempt persistence

**Files:**
- Create: `src/persistence/AttemptStore.ts`
- Create: `src/persistence/IndexedDbStore.ts`
- Test: `tests/unit/persistence/IndexedDbStore.test.ts`

**Interfaces:**
- Produces: `AttemptStore.save(state)`, `AttemptStore.load(attemptId)`, `AttemptStore.remove(attemptId)`.

- [ ] **Step 1: Write failing tests** using `fake-indexeddb` for save/load overwrite and missing-attempt behavior.
- [ ] **Step 2: Run tests**; expected: FAIL.
- [ ] **Step 3: Implement IndexedDB adapter** with one database and versioned object store.
- [ ] **Step 4: Run tests**; expected: PASS.
- [ ] **Step 5: Commit:** `feat: persist attempts locally with IndexedDB`.

### Task 6: Reading player shell

**Files:**
- Create: `src/features/exam/ExamHeader.tsx`
- Create: `src/features/exam/QuestionNavigator.tsx`
- Create: `src/features/reading/ReadingPlayer.tsx`
- Create: `src/features/reading/ReadingPassagePane.tsx`
- Create: `src/features/reading/ReadingQuestionPane.tsx`
- Test: `tests/component/reading/ReadingPlayer.test.tsx`
- Test: `tests/component/exam/QuestionNavigator.test.tsx`

**Interfaces:**
- Consumes: engine reducer/state/selectors and `ReadingTest` schema.
- Produces: two-pane Reading interface with independent scroll regions and exam navigation.

- [ ] **Step 1: Write failing component tests** for passage/question split, direct question navigation, answered indicator, review indicator, and active question state.
- [ ] **Step 2: Run tests**; expected: FAIL.
- [ ] **Step 3: Implement minimal components** with semantic controls and Windows 7-compatible CSS.
- [ ] **Step 4: Run tests**; expected: PASS.
- [ ] **Step 5: Commit:** `feat: add exam-style Reading player shell`.

### Task 7: Initial question renderers

**Files:**
- Create: `src/question-types/registry.tsx`
- Create: `src/question-types/SingleChoiceQuestion.tsx`
- Create: `src/question-types/TextAnswerQuestion.tsx`
- Test: `tests/component/reading/QuestionRenderers.test.tsx`

**Interfaces:**
- Produces: `renderQuestion(question, response, onChange)` supporting single-choice and text-answer families as the first registry entries.

- [ ] **Step 1: Write failing tests** for single-choice updates and text-answer updates without mutating question data.
- [ ] **Step 2: Run tests**; expected: FAIL.
- [ ] **Step 3: Implement registry and renderers**.
- [ ] **Step 4: Run tests**; expected: PASS.
- [ ] **Step 5: Commit:** `feat: add first question renderer registry`.

### Task 8: Sample Reading test and integrated recovery flow

**Files:**
- Create: `src/sample-data/readingSample.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/features/reading/ReadingPlayer.tsx`
- Test: `tests/component/reading/ReadingRecovery.test.tsx`

**Interfaces:**
- Produces: a copyright-safe synthetic Reading test usable as a functional demo and integration fixture.

- [ ] **Step 1: Write failing integration test**: start attempt, answer question, persist state, recreate app state, reload attempt, and verify answer + remaining time are restored.
- [ ] **Step 2: Run test**; expected: FAIL.
- [ ] **Step 3: Add synthetic sample test and persistence wiring**.
- [ ] **Step 4: Run test**; expected: PASS.
- [ ] **Step 5: Run full unit/component suite**; expected: all PASS.
- [ ] **Step 6: Run `npm run build`**; expected: PASS.
- [ ] **Step 7: Commit:** `feat: complete recoverable Reading milestone`.

### Task 9: Supabase client boundary and backend migration plan

**Files:**
- Create: `src/shared/env.ts`
- Create: `src/database/supabaseClient.ts`
- Create: `supabase/README.md`
- Create: `docs/architecture/backend-boundaries.md`
- Test: `tests/unit/database/env.test.ts`

**Interfaces:**
- Produces: optional remote client initialization that does not prevent offline startup when environment configuration is absent.

- [ ] **Step 1: Write failing tests** for environment validation and offline/no-cloud configuration.
- [ ] **Step 2: Run tests**; expected: FAIL.
- [ ] **Step 3: Implement environment parser and lazy Supabase client boundary**.
- [ ] **Step 4: Run tests**; expected: PASS.
- [ ] **Step 5: Document that database migrations/RLS are the next backend sub-project; do not expose answer keys in the client schema.
- [ ] **Step 6: Commit:** `feat: add optional Supabase boundary`.

## Self-Review

- Spec coverage for this milestone: Windows 7 target, shared engine, Reading shell, timer, local persistence, schema separation, secure backend boundary are covered.
- Deferred intentionally to later independent plans: full auth/RLS schema, importer/OCR, verification engine, Listening, Writing, PWA packaging, Electron packaging, `.exam-pack` format, Cloudflare R2.
- No production answer keys are included in this milestone.
- Every behavior task follows RED → GREEN → refactor and requires runnable verification.
