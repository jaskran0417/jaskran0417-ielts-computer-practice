# Session Modes, Results, and Modern UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready slice for module-selectable sessions, Practice/Mock behavior, pause/interruption auditing, partial/pending result summaries, and a permanent modern responsive application shell without weakening the focused exam player.

**Architecture:** Introduce a pure TypeScript session domain that owns validation, mode restrictions, audit semantics, and result composition. Keep it independent from importer/OCR internals and from React. Persist session drafts locally through a repository interface, then build React setup/result screens on top. Existing Reading remains the only fully implemented exam module in this slice; Listening/Writing player integrations consume the new session contracts in later slices rather than being faked here.

**Tech Stack:** React 19.3, TypeScript, Vite 8, Vitest, Testing Library, IndexedDB/idb, existing exam engine and Reading UI.

**Spec:** `docs/superpowers/specs/2026-09-17-session-modes-results-ui-design.md`

## Global Constraints

- Work only on `feat/session-modes-results-ui`; do not implement directly on `main`.
- Session modules are `LISTENING`, `READING`, `WRITING`; Speaking remains future-compatible but out of this slice.
- `writingDelivery` is required exactly when Writing is selected.
- Mock Listening must reject candidate pause/replay/seek at the domain boundary; hiding a button alone is insufficient.
- Practice pauses and technical interruptions are semantically distinct and append-oriented.
- Partial sessions never produce a full overall IELTS band.
- Paper-Writing upload is optional and skipping it cannot block session completion.
- Student-safe payloads must not gain protected answer definitions.
- The application shell must remain compatible with Firefox ESR 115 and best-effort Chrome/Edge 109.
- Existing Reading attempt persistence/timing behavior must continue passing unchanged.
- TDD is required: failing test first, observe RED, then implementation, observe GREEN.

---

## File map

- `src/session/types.ts` — session, mode, writing-delivery, audit, and result domain types.
- `src/session/validate-session.ts` — deterministic validation/canonicalization.
- `src/session/validate-session.test.ts` — validation tests.
- `src/session/listening-policy.ts` — domain permission gate for pause/replay/seek.
- `src/session/listening-policy.test.ts` — Mock/Practice restriction tests.
- `src/session/audit.ts` — append-only pause/interruption helpers and summaries.
- `src/session/audit.test.ts` — audit behavior tests.
- `src/session/results.ts` — partial/pending result composition.
- `src/session/results.test.ts` — result semantics tests.
- `src/session/session-repository.ts` — local persistence contract.
- `src/session/indexeddb-session-repository.ts` — IndexedDB implementation.
- `src/session/indexeddb-session-repository.test.ts` — repository round-trip tests.
- `src/features/sessions/SessionBuilder.tsx` — module/mode/Writing-delivery setup UI.
- `src/features/sessions/SessionBuilder.test.tsx` — setup workflow tests.
- `src/features/results/SessionResult.tsx` — result summary UI.
- `src/features/results/SessionResult.test.tsx` — partial/pending result UI tests.
- `src/app/AppShell.tsx` — responsive product shell.
- `src/app/design-tokens.css` — permanent design tokens.
- `src/app/App.tsx` — small screen-state integration for this vertical slice.
- `src/app/styles.css` — feature/layout rules consuming tokens.

---

### Task 1: Session configuration domain

**Files:**
- Create: `src/session/types.ts`
- Create: `src/session/validate-session.test.ts`
- Create: `src/session/validate-session.ts`

**Interfaces:**

```ts
export type SessionModule = 'LISTENING' | 'READING' | 'WRITING';
export type SessionMode = 'PRACTICE' | 'MOCK';
export type WritingDelivery = 'COMPUTER' | 'PAPER';

export interface SessionConfig {
  id: string;
  testId: string;
  testVersionId: string;
  modules: SessionModule[];
  mode: SessionMode;
  writingDelivery?: WritingDelivery;
  createdAtMs: number;
}

export type SessionValidationResult =
  | { ok: true; value: SessionConfig }
  | { ok: false; errors: string[] };

export function validateSessionConfig(config: SessionConfig): SessionValidationResult;
```

- [ ] **Step 1: Write RED tests**

Cover exactly:

```ts
it('rejects an empty module selection', ...);
it('rejects duplicate modules', ...);
it('requires writing delivery when Writing is selected', ...);
it('rejects writing delivery when Writing is not selected', ...);
it('accepts Listening + Reading Mock', ...);
it('accepts Writing Paper Practice', ...);
```

- [ ] **Step 2: Run the focused test and observe failure because the implementation does not exist**

```bash
npm test -- src/session/validate-session.test.ts --run
```

- [ ] **Step 3: Implement the minimal deterministic validator**

Implementation rules:

```ts
const SUPPORTED_MODULES = new Set<SessionModule>(['LISTENING', 'READING', 'WRITING']);
```

Return all discovered validation errors in stable order. Do not silently drop duplicates or silently remove invalid `writingDelivery`; invalid input stays invalid.

- [ ] **Step 4: Run the focused test GREEN**

```bash
npm test -- src/session/validate-session.test.ts --run
```

- [ ] **Step 5: Run existing exam-engine/Reading tests to catch regressions**

```bash
npm test -- src/exam-engine src/features/reading --run
```

- [ ] **Step 6: Commit**

```bash
git add src/session/types.ts src/session/validate-session.ts src/session/validate-session.test.ts
git commit -m "feat: add validated session configuration"
```

### Task 2: Listening mode permission boundary and audit events

**Files:**
- Create: `src/session/listening-policy.test.ts`
- Create: `src/session/listening-policy.ts`
- Create: `src/session/audit.test.ts`
- Create: `src/session/audit.ts`
- Modify: `src/session/types.ts`

**Interfaces:**

```ts
export type ListeningCandidateAction = 'PAUSE' | 'REPLAY' | 'SEEK';

export interface ListeningPermissions {
  pause: boolean;
  replay: boolean;
  seek: boolean;
}

export function listeningPermissions(mode: SessionMode): ListeningPermissions;
export function assertListeningActionAllowed(
  mode: SessionMode,
  action: ListeningCandidateAction,
): void;

export type AttemptAuditEvent =
  | {
      id: string;
      type: 'PRACTICE_PAUSE';
      module: SessionModule;
      startedAtMs: number;
      endedAtMs: number;
      audioPositionSeconds?: number;
    }
  | {
      id: string;
      type: 'TECHNICAL_INTERRUPTION';
      module: SessionModule;
      startedAtMs: number;
      endedAtMs: number;
      lastSecureAudioPositionSeconds?: number;
      recoveryAudioPositionSeconds?: number;
      source: 'SYSTEM' | 'TEACHER';
      note?: string;
    };

export interface AuditSummary {
  practicePauseCount: number;
  practicePausedMs: number;
  technicalInterruptionCount: number;
  technicalInterruptedMs: number;
}

export function appendAuditEvent(
  events: readonly AttemptAuditEvent[],
  event: AttemptAuditEvent,
): AttemptAuditEvent[];
export function summarizeAuditEvents(events: readonly AttemptAuditEvent[]): AuditSummary;
```

- [ ] **Step 1: Write Listening-policy RED tests** proving Practice allows pause/replay/seek and Mock rejects all three candidate actions.
- [ ] **Step 2: Run RED** with `npm test -- src/session/listening-policy.test.ts --run`.
- [ ] **Step 3: Implement policy functions with no React dependency.** `assertListeningActionAllowed` throws `Error('Mock Listening does not allow candidate <action>')` for a denied action.
- [ ] **Step 4: Run Listening-policy GREEN.**
- [ ] **Step 5: Write audit RED tests** proving append is immutable, durations are clamped at zero for malformed negative ranges, Practice pauses are counted separately from technical interruptions, and audio positions remain unchanged.
- [ ] **Step 6: Run audit RED** with `npm test -- src/session/audit.test.ts --run`.
- [ ] **Step 7: Implement minimal audit helpers.** Do not mutate input arrays and do not merge/rewrite historical events.
- [ ] **Step 8: Run audit GREEN and full session tests.**
- [ ] **Step 9: Commit** with `git commit -m "feat: enforce listening mode and audit semantics"`.

### Task 3: Partial/pending result composition

**Files:**
- Modify: `src/session/types.ts`
- Create: `src/session/results.test.ts`
- Create: `src/session/results.ts`

**Interfaces:**

```ts
export type WritingResultState =
  | 'NOT_INCLUDED'
  | 'COMPLETED_PENDING_MARKING'
  | 'COMPLETED_NOT_UPLOADED'
  | 'MARKED';

export interface ScoredModuleResult {
  module: 'LISTENING' | 'READING';
  rawScore?: number;
  totalQuestions?: number;
  band?: number;
}

export interface WritingModuleResult {
  module: 'WRITING';
  state: WritingResultState;
  band?: number;
  delivery?: WritingDelivery;
}

export interface SessionResultSummary {
  selectedModules: SessionModule[];
  modules: Array<ScoredModuleResult | WritingModuleResult>;
  overallBand: number | null;
  overallStatus: 'NOT_APPLICABLE' | 'PENDING' | 'COMPLETE';
}

export function buildSessionResultSummary(input: {
  config: SessionConfig;
  scoredModules: ScoredModuleResult[];
  writing?: WritingModuleResult;
}): SessionResultSummary;
```

- [ ] **Step 1: Write RED tests** proving Reading-only and Listening+Reading have `overallBand: null`/`NOT_APPLICABLE`, missing Writing in a full three-module session is `PENDING`, paper Writing may be `COMPLETED_NOT_UPLOADED`, and unselected modules are represented as `NOT_INCLUDED` where relevant to UI presentation.
- [ ] **Step 2: Run RED.**
- [ ] **Step 3: Implement result composition.** Do not invent a complete overall band unless every selected scored module has an explicit band and Writing is `MARKED`; this slice may keep full overall-band calculation conservative and return null if any required component is missing.
- [ ] **Step 4: Run GREEN and all session tests.**
- [ ] **Step 5: Commit** with `git commit -m "feat: compose partial and pending session results"`.

### Task 4: Offline session configuration persistence

**Files:**
- Create: `src/session/session-repository.ts`
- Create: `src/session/indexeddb-session-repository.test.ts`
- Create: `src/session/indexeddb-session-repository.ts`

**Interfaces:**

```ts
export interface SessionRepository {
  loadSession(id: string): Promise<SessionConfig | null>;
  saveSession(config: SessionConfig): Promise<void>;
  deleteSession(id: string): Promise<void>;
  listSessions(): Promise<SessionConfig[]>;
}
```

- [ ] **Step 1: Write RED IndexedDB contract tests** for save/load, overwrite-by-id, delete, and list order newest-first.
- [ ] **Step 2: Run RED.**
- [ ] **Step 3: Implement with a dedicated IndexedDB store/database name that does not modify the existing attempt store.**
- [ ] **Step 4: Run GREEN.**
- [ ] **Step 5: Run all storage and session tests together.**
- [ ] **Step 6: Commit** with `git commit -m "feat: persist session configurations offline"`.

### Task 5: Modern application shell and Session Builder UI

**Files:**
- Create: `src/app/design-tokens.css`
- Create: `src/app/AppShell.tsx`
- Create: `src/features/sessions/SessionBuilder.test.tsx`
- Create: `src/features/sessions/SessionBuilder.tsx`
- Modify: `src/main.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**

```ts
interface SessionBuilderProps {
  testId: string;
  testVersionId: string;
  nowMs?: number;
  onCreate(config: SessionConfig): void;
}
```

- [ ] **Step 1: Write UI RED tests** proving: no modules initially blocks creation; selecting Reading enables a valid Practice session; selecting Writing reveals Computer/Paper delivery; removing Writing removes delivery choice; selecting Listening+Reading+Mock emits the exact expected config.
- [ ] **Step 2: Run UI RED.**
- [ ] **Step 3: Implement `SessionBuilder` using the pure validator rather than duplicating validation in React.**
- [ ] **Step 4: Implement `AppShell` with semantic navigation, desktop sidebar, compact mobile header/drawer affordance, active-section state, and a content landmark.** Do not copy GitHub/IELTS branding or visual assets.
- [ ] **Step 5: Add design tokens** for typography, spacing, surfaces, border/radius, semantic status, controls, focus rings, motion, and breakpoints. `styles.css` consumes variables rather than introducing arbitrary repeated visual constants.
- [ ] **Step 6: Run UI GREEN plus existing Reading tests.**
- [ ] **Step 7: Run typecheck/build.**
- [ ] **Step 8: Commit** with `git commit -m "feat: add modern session setup shell"`.

### Task 6: Result summary UI

**Files:**
- Create: `src/features/results/SessionResult.test.tsx`
- Create: `src/features/results/SessionResult.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**

```ts
interface SessionResultProps {
  summary: SessionResultSummary;
  audit?: AuditSummary;
}
```

- [ ] **Step 1: Write RED tests** proving Reading-only shows Reading and no overall band; Listening+Reading marks Writing as not included; pending paper Writing clearly states `Writing completed on paper — not submitted to app`; Practice audit shows pause count/total time without altering academic score.
- [ ] **Step 2: Run RED.**
- [ ] **Step 3: Implement accessible result sections/status badges with no protected answers.**
- [ ] **Step 4: Run GREEN.**
- [ ] **Step 5: Commit** with `git commit -m "feat: add session result summary UI"`.

### Task 7: App integration without weakening the Reading exam

**Files:**
- Create: `src/app/App.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/styles.css`

**Behavior:**

The demo/root flow becomes:

```text
Platform shell -> Session setup -> Start -> focused exam player
```

For this slice, only a session whose selected runnable module is Reading enters the existing `ExamProvider` + `ReadingExam`. Selecting future modules remains valid domain data but the integration must clearly state when test content/player support is not yet attached instead of pretending an exam ran.

- [ ] **Step 1: Write RED integration tests** proving the initial screen is Session setup, Reading-only launches the existing Reading exam, the normal platform navigation is absent while the exam is active, and a configuration requiring an unattached module gets a clear non-destructive readiness message.
- [ ] **Step 2: Run RED.**
- [ ] **Step 3: Implement the minimal screen-state integration.** Keep existing optional `AttemptRepository`/`nowMs` test hooks working.
- [ ] **Step 4: Run GREEN plus every existing Reading/ExamProvider regression test.**
- [ ] **Step 5: Run full typecheck/tests/build.**
- [ ] **Step 6: Commit** with `git commit -m "feat: integrate session setup with exam launch"`.

### Task 8: Independent audit and completion verification

**Files:**
- Create: `docs/architecture/session-modes-audit.md`

- [ ] **Step 1: Re-read the approved spec line-by-line** and create a requirements table with `implemented`, `deferred by approved first-slice scope`, or `gap`.
- [ ] **Step 2: Inspect the final branch diff against `main`** for accidental answer-key exposure, importer coupling, main-branch edits, duplicate domain rules in UI, or arbitrary styling that bypasses tokens.
- [ ] **Step 3: Run fresh verification:**

```bash
npm run typecheck
npm test -- --run
npm run build
```

- [ ] **Step 4: Verify CI on the final commit** and inspect failed/warning output rather than relying only on status text.
- [ ] **Step 5: Record exact remaining deferred slices**: Listening media/timeline player, full computer Writing editor, optional handwritten upload storage, teacher assignment, advanced analytics, Speaking.
- [ ] **Step 6: Commit the audit only after evidence is fresh** with `git commit -m "docs: audit session modes implementation"`.
