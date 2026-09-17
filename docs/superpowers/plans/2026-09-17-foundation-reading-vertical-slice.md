# Foundation + Reading Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-quality vertical slice: a Windows-7-compatible React/Vite application with a deterministic Reading exam engine, local-first IndexedDB persistence, a realistic two-pane Reading UI, Supabase-backed schema foundations, and automated tests/CI.

**Architecture:** The exam domain is pure TypeScript and independent of React/Supabase. React renders state and dispatches typed actions. IndexedDB is the local-first persistence adapter; Supabase is the optional cloud adapter. Published test content uses a versioned universal schema, and protected answer definitions stay out of the normal student payload.

**Tech Stack:** React 19.3.0, React DOM 19.3.0, TypeScript 7.0.2, Vite 8.2.2, Vitest 5.0.1, Testing Library, idb 8.0.3, Supabase JS 2.116.0, PostgreSQL/Supabase RLS.

**Spec:** `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md` and `docs/superpowers/specs/2026-09-17-offline-desktop-delivery-design.md`

## Global Constraints

- Windows 7 application-level feature parity is required; primary browser target Firefox ESR 115, secondary Chrome 109 / Edge 109.
- Production Vite output must explicitly target `chrome109`, `edge109`, and `firefox115` rather than Vite defaults.
- Internet is optional for core exam operation after required assets are local.
- Domain exam logic must not depend on React, Supabase, Electron, or browser UI code.
- Published test versions are immutable.
- Correct answers must not be present in ordinary student content payloads.
- Local writes happen before cloud sync.
- No separate Windows-7 exam engine or UI fork.
- TDD is required for production behavior: failing test first, then minimal implementation.

---

## File map

- `package.json` — scripts and pinned dependency ranges.
- `vite.config.ts` — React plugin, explicit legacy-compatible production targets.
- `vitest.config.ts` — test environment and setup.
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` — strict TS configuration.
- `.github/workflows/ci.yml` — install, typecheck, test, build.
- `src/test-schema/types.ts` — universal test/student payload types.
- `src/test-schema/sample-reading.ts` — development fixture without protected answers.
- `src/exam-engine/types.ts` — attempt state/actions/status.
- `src/exam-engine/create-attempt.ts` — deterministic initial state.
- `src/exam-engine/reducer.ts` — pure state transitions.
- `src/exam-engine/time.ts` — timestamp-derived remaining-time calculations.
- `src/exam-engine/reducer.test.ts` / `time.test.ts` — domain tests.
- `src/storage/attempt-repository.ts` — persistence interface.
- `src/storage/indexeddb-attempt-repository.ts` — `idb` implementation.
- `src/storage/indexeddb-attempt-repository.test.ts` — persistence contract tests.
- `src/features/exam/ExamProvider.tsx` — React adapter around pure reducer.
- `src/features/reading/ReadingExam.tsx` — Reading two-pane shell.
- `src/features/reading/QuestionNavigator.tsx` — direct question navigation/review state.
- `src/question-types/SingleChoiceQuestion.tsx` — first choice renderer.
- `src/question-types/GapFillQuestion.tsx` — first typed-answer renderer.
- `src/features/reading/ReadingExam.test.tsx` — UI interaction tests.
- `src/app/App.tsx` / `src/app/styles.css` / `src/main.tsx` — app entry/UI styling.
- `src/database/supabase.ts` — optional client, configured only from environment variables.
- `supabase/migrations/20260917190000_foundation.sql` — initial roles/tests/version/attempt tables + RLS.
- `.env.example` — publishable configuration names only, no secrets.

---

### Task 1: Scaffold, compatibility target, and CI

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `src/test/setup.ts`
- Create: `.github/workflows/ci.yml`
- Create: `.gitignore`

**Interfaces:**
- Consumes: none.
- Produces: `npm run typecheck`, `npm test`, `npm run build`; Vite build target array `['chrome109','edge109','firefox115']`.

- [ ] **Step 1: Add package/configuration scaffold**

Use dependencies:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "idb": "^8.0.3",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^6.1.1",
    "jsdom": "^30.0.1",
    "typescript": "^7.0.2",
    "vite": "^8.2.2",
    "vitest": "^5.0.1"
  }
}
```

`vite.config.ts` must include:

```ts
build: {
  target: ['chrome109', 'edge109', 'firefox115'],
}
```

- [ ] **Step 2: Add CI**

CI uses Node 22 and runs:

```bash
npm ci
npm run typecheck
npm test -- --run
npm run build
```

- [ ] **Step 3: Commit configuration**

```bash
git add package.json index.html vite.config.ts vitest.config.ts tsconfig*.json src/test/setup.ts .github/workflows/ci.yml .gitignore
git commit -m "build: scaffold React exam application"
```

### Task 2: Universal student test schema

**Files:**
- Create: `src/test-schema/types.ts`
- Create: `src/test-schema/sample-reading.test.ts`
- Create: `src/test-schema/sample-reading.ts`

**Interfaces:**
- Produces: `StudentTestPackage`, `ReadingModule`, `ReadingPassage`, `QuestionGroup`, `StudentQuestion`, `SingleChoiceQuestion`, `GapFillQuestion`.

- [ ] **Step 1: Write failing fixture/schema test**

```ts
import { describe, expect, it } from 'vitest';
import { sampleReadingTest } from './sample-reading';

it('contains ordered questions but no protected answers', () => {
  const questions = sampleReadingTest.modules[0].sections.flatMap((section) =>
    section.questionGroups.flatMap((group) => group.questions),
  );
  expect(questions.map((q) => q.number)).toEqual([1, 2, 3, 4]);
  expect(JSON.stringify(sampleReadingTest)).not.toContain('correctAnswer');
});
```

- [ ] **Step 2: Run test and verify RED**

```bash
npm test -- src/test-schema/sample-reading.test.ts --run
```

Expected: FAIL because schema/fixture files do not exist.

- [ ] **Step 3: Implement discriminated-union schema and sample Reading fixture**

Core question union:

```ts
export type StudentQuestion = SingleChoiceQuestion | GapFillQuestion;

export interface QuestionBase {
  id: string;
  number: number;
  prompt: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'SINGLE_CHOICE';
  options: Array<{ id: string; label: string }>;
}

export interface GapFillQuestion extends QuestionBase {
  type: 'GAP_FILL';
  placeholder?: string;
}
```

- [ ] **Step 4: Run test and verify GREEN**

```bash
npm test -- src/test-schema/sample-reading.test.ts --run
```

- [ ] **Step 5: Commit**

```bash
git add src/test-schema
git commit -m "feat: define student test schema"
```

### Task 3: Deterministic exam engine and timer

**Files:**
- Create: `src/exam-engine/types.ts`
- Create: `src/exam-engine/create-attempt.ts`
- Create: `src/exam-engine/reducer.test.ts`
- Create: `src/exam-engine/reducer.ts`
- Create: `src/exam-engine/time.test.ts`
- Create: `src/exam-engine/time.ts`

**Interfaces:**
- Produces: `ExamAttemptState`, `ExamAction`, `createAttempt(test, nowMs)`, `examReducer(state, action)`, `remainingSeconds(state, nowMs)`.

- [ ] **Step 1: Write reducer failing tests**

Tests must prove:

```ts
it('records an answer without mutating previous state', ...)
it('toggles review state for a question', ...)
it('navigates directly to another question', ...)
it('rejects answer changes after submission', ...)
```

Representative assertion:

```ts
const next = examReducer(initial, {
  type: 'ANSWER_CHANGED',
  questionId: 'q1',
  value: 'A',
});
expect(next.answers.q1).toBe('A');
expect(initial.answers.q1).toBeUndefined();
```

- [ ] **Step 2: Verify reducer tests fail**

```bash
npm test -- src/exam-engine/reducer.test.ts --run
```

- [ ] **Step 3: Implement minimal reducer**

Actions:

```ts
export type ExamAction =
  | { type: 'ANSWER_CHANGED'; questionId: string; value: string | string[] }
  | { type: 'TOGGLE_REVIEW'; questionId: string }
  | { type: 'NAVIGATE'; questionId: string }
  | { type: 'SUBMIT'; submittedAtMs: number };
```

- [ ] **Step 4: Verify reducer tests pass**

- [ ] **Step 5: Write timer failing tests**

Prove timestamp-derived timing:

```ts
expect(remainingSeconds(state, state.startedAtMs + 10_000)).toBe(3590);
expect(remainingSeconds(state, state.startedAtMs + 3_700_000)).toBe(0);
```

- [ ] **Step 6: Implement timer and verify all engine tests pass**

```bash
npm test -- src/exam-engine --run
```

- [ ] **Step 7: Commit**

```bash
git add src/exam-engine
git commit -m "feat: add deterministic exam engine"
```

### Task 4: Local-first IndexedDB attempt repository

**Files:**
- Create: `src/storage/attempt-repository.ts`
- Create: `src/storage/indexeddb-attempt-repository.test.ts`
- Create: `src/storage/indexeddb-attempt-repository.ts`

**Interfaces:**
- Produces:

```ts
export interface AttemptRepository {
  loadAttempt(id: string): Promise<ExamAttemptState | null>;
  saveAttempt(attempt: ExamAttemptState): Promise<void>;
  deleteAttempt(id: string): Promise<void>;
}
```

- [ ] **Step 1: Write failing repository contract test**

Use a unique database name per test and prove save/load/delete round-trip.

- [ ] **Step 2: Verify RED**

```bash
npm test -- src/storage/indexeddb-attempt-repository.test.ts --run
```

- [ ] **Step 3: Implement repository with `idb`**

Object store: `attempts`, key path: `id`.

- [ ] **Step 4: Verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat: persist attempts in IndexedDB"
```

### Task 5: React exam adapter and Reading UI

**Files:**
- Create: `src/features/exam/ExamProvider.tsx`
- Create: `src/features/reading/ReadingExam.test.tsx`
- Create: `src/features/reading/ReadingExam.tsx`
- Create: `src/features/reading/QuestionNavigator.tsx`
- Create: `src/question-types/SingleChoiceQuestion.tsx`
- Create: `src/question-types/GapFillQuestion.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/styles.css`
- Create: `src/main.tsx`

**Interfaces:**
- `ExamProvider` owns `useReducer(examReducer)` and persists each new state locally.
- `ReadingExam` receives a `StudentTestPackage` and renders passage + active question group.

- [ ] **Step 1: Write failing Reading interaction test**

Prove user-visible behavior:

```ts
render(<App />);
expect(screen.getByText('Reading')).toBeInTheDocument();
await user.click(screen.getByRole('radio', { name: /A/i }));
expect(screen.getByTestId('question-1-status')).toHaveAttribute('data-state', 'answered');
await user.click(screen.getByRole('button', { name: 'Question 2' }));
expect(screen.getByText(/Question 2/i)).toBeInTheDocument();
```

Also test review toggling and return navigation.

- [ ] **Step 2: Verify RED**

```bash
npm test -- src/features/reading/ReadingExam.test.tsx --run
```

- [ ] **Step 3: Implement minimal UI**

Desktop layout requirements:

```text
header: module title + remaining time
body: passage pane | question pane
footer: numbered navigator + review toggle
```

Use CSS Grid/Flex only with APIs supported by the compatibility targets. Do not use React ViewTransition or new browser-only features.

- [ ] **Step 4: Verify Reading tests pass**

- [ ] **Step 5: Run all tests and build**

```bash
npm run typecheck
npm test -- --run
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add first Reading exam experience"
```

### Task 6: Supabase foundation and RLS

**Files:**
- Create: `.env.example`
- Create: `src/database/supabase.ts`
- Create: `supabase/migrations/20260917190000_foundation.sql`

**Interfaces:**
- Web client consumes only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Initial database produces `profiles`, `tests`, `test_versions`, `attempts`, `attempt_responses`.

- [ ] **Step 1: Create migration with RLS enabled on every public table**

Core shape:

```sql
create type public.user_role as enum ('admin', 'teacher', 'student');
create type public.test_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  display_name text,
  created_at timestamptz not null default now()
);
```

Tests and versions use immutable UUID identifiers. Attempts reference an exact `test_version_id`.

- [ ] **Step 2: Add grants/RLS policies**

Rules:

- students can read published test metadata/versions;
- students can read/write only their own attempts/responses;
- teacher/admin management policies require role lookup from `profiles`;
- ordinary student-facing test version data contains no answer definitions.

- [ ] **Step 3: Add environment-safe Supabase client**

```ts
export const isSupabaseConfigured = Boolean(url && publishableKey);
```

Do not throw during purely offline startup when variables are absent.

- [ ] **Step 4: Apply migration to project `qmluvaafvmjtpneoywnq`**

Use Supabase migration tooling, then run security advisors.

- [ ] **Step 5: Commit**

```bash
git add .env.example src/database supabase/migrations
git commit -m "feat: add Supabase foundation and RLS"
```

### Task 7: Verification, CI, and delivery checkpoint

**Files:**
- Modify: `README.md`
- Modify as needed: files from prior tasks only to fix verified failures.

**Interfaces:**
- Produces a reproducible first milestone and a pull request from `feat/foundation-reading` to `main`.

- [ ] **Step 1: Run local-equivalent verification in CI**

Required green commands:

```bash
npm ci
npm run typecheck
npm test -- --run
npm run build
```

- [ ] **Step 2: Run Supabase security and performance advisors**

No unacknowledged critical security findings.

- [ ] **Step 3: Update README**

Document:

```bash
npm install
npm run dev
npm test -- --run
npm run build
```

and environment variables, Windows 7 browser target, offline-first behavior, and current milestone scope.

- [ ] **Step 4: Create PR**

PR title:

```text
feat: foundation and Reading vertical slice
```

PR body summarizes architecture, tests, Windows 7 compatibility target, Supabase migration, and known next phases.

- [ ] **Step 5: Review changed files and CI before merge**

Do not merge while CI/security checks are unresolved.
