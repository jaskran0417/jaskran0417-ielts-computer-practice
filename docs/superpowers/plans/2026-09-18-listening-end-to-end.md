# Listening End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Listening module from local import through audio-controlled Practice/Mock playback, protected scoring, results, and published-test launch.

**Architecture:** Extend the Universal Test Schema with `ListeningModule` / `ListeningPart` while reusing existing `StudentQuestion` renderers and protected answer definitions. Audio playback state is persisted semantically in the attempt so refresh/recovery can restore a secure position. The HTML media element's `currentTime` is the playback truth; custom controls enforce session-mode policy. Local import accepts audio as a first-class source and Listening structuring maps question material + audio + answer key into a student-safe package.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest, Testing Library, IndexedDB/idb, existing protected scoring.

**Specs:**
- `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`
- `docs/superpowers/specs/2026-09-17-session-modes-results-ui-design.md`
- `docs/superpowers/specs/2026-09-18-import-bundle-runnable-test-converter-design.md`

## Global Constraints

- Mock Listening blocks candidate pause, replay, restart and seeking.
- Practice Listening may pause/replay/seek and records deliberate candidate pauses.
- Audio `currentTime` is authoritative.
- Volume control remains available in both modes.
- Standard Listening supports four parts and 40 questions when the source contains them.
- Final review is configurable; the standard profile uses 120 seconds.
- No answer definitions in the student payload.
- Local playback/import must work without internet.
- Internet is not required once local sources/test assets are available.
- Do not guess question text or answer keys when extraction is ambiguous.
- Keep Windows 7 browser compatibility constraints in UI/runtime choices.

---

### Task 1: Listening schema and shared module helpers

**Files:**
- Modify: `src/test-schema/types.ts`
- Create: `src/test-schema/module-helpers.ts`
- Test: `src/test-schema/module-helpers.test.ts`
- Modify: `src/exam-engine/create-attempt.ts`
- Modify: Reading code only where union narrowing is required.

**Produces:**
- `ListeningModule`
- `ListeningPart`
- `StudentModule = ReadingModule | ListeningModule`
- `readingModuleFromTest()`
- `listeningModuleFromTest()`

Listening part shape:

```ts
interface ListeningPart {
  id: string;
  title: string;
  partNumber: number;
  audioAssetId: string;
  questionGroups: QuestionGroup[];
}
```

Listening module shape:

```ts
interface ListeningModule {
  id: string;
  kind: 'LISTENING';
  title: string;
  finalReviewSeconds: number;
  sections: ListeningPart[];
}
```

- [ ] Write RED helper/schema usage tests.
- [ ] Expand schema and adapt generic question-ID traversal.
- [ ] Narrow Reading player/import publication explicitly to Reading.
- [ ] Run typecheck and tests.

### Task 2: Persistent Listening playback state

**Files:**
- Modify: `src/exam-engine/types.ts`
- Modify: `src/exam-engine/create-attempt.ts`
- Modify: `src/exam-engine/reducer.ts`
- Test: `src/exam-engine/reducer.test.ts`

**Produces:**

```ts
interface ListeningPauseAudit {
  id: string;
  startedAtMs: number;
  endedAtMs?: number;
  audioPositionSeconds: number;
}

interface ListeningPlaybackState {
  partIndex: number;
  audioPositionSeconds: number;
  started: boolean;
  ended: boolean;
  finalReviewStartedAtMs?: number;
  pauses: ListeningPauseAudit[];
}
```

Actions:
- `LISTENING_STARTED`
- `LISTENING_PROGRESS`
- `LISTENING_PART_CHANGED`
- `LISTENING_PRACTICE_PAUSE_STARTED`
- `LISTENING_PRACTICE_PAUSE_ENDED`
- `LISTENING_FINAL_REVIEW_STARTED`
- `LISTENING_ENDED`

- [ ] Write RED reducer tests including legacy-attempt restore.
- [ ] Implement immutable state/actions.
- [ ] Verify persistence through existing attempt repository tests.

### Task 3: Playback policy helpers

**Files:**
- Create: `src/features/listening/playback-policy.ts`
- Test: `src/features/listening/playback-policy.test.ts`

**Produces:**
- `listeningPlaybackPolicy(mode)`
- explicit booleans for candidate pause, seek, replay and restart;
- Mock returns all restricted actions false;
- Practice returns true for learning controls.

### Task 4: Audio source import

**Files:**
- Modify: `src/features/importer/local-file-processor.ts`
- Modify: `src/features/importer/local-file-processor.test.ts`
- Modify only UI copy/accept filters if required.

Behavior:
- accept MP3/WAV/M4A/compatible `audio/*`;
- retain original bytes;
- create `SourceDocumentRecord.kind = 'AUDIO'`;
- no fake OCR/text field is created;
- unsupported audio MIME/extension receives actionable error.

- [ ] RED tests for MP3/WAV/M4A import.
- [ ] Implement audio recognition/source record.
- [ ] Verify bundle merging still preserves audio bytes.

### Task 5: Listening structure parser

**Files:**
- Create: `src/features/importer/listening/types.ts`
- Create: `src/features/importer/listening/listening-structure-parser.ts`
- Test: `src/features/importer/listening/listening-structure-parser.test.ts`
- Reuse: Reading instruction/option/question-type parsers where semantics match.

Behavior:
- recognize explicit `Part 1` / `Section 1` headings;
- parse question ranges and existing objective question types;
- assign questions to four parts from explicit source evidence;
- a standard 40-question fallback may use 1–10, 11–20, 21–30, 31–40 only when no contradictory part evidence exists;
- ambiguity creates review items instead of invented structure.

### Task 6: Listening answer mapping and publication

**Files:**
- Create: `src/features/importer/listening/listening-import-converter.ts`
- Test: `src/features/importer/listening/listening-import-converter.test.ts`
- Create: `src/features/importer/publication/listening-publication.ts`
- Test: `src/features/importer/publication/listening-publication.test.ts`
- Generalize: local publisher input from Reading-specific publication to objective-test publication.

Behavior:
- require question material + answer key + at least one AUDIO assignment;
- one audio source may back all parts;
- multiple audio sources may map one per part;
- no guessed timestamps;
- protected answers remain separate;
- publish blocked for missing audio/question/answer coverage.

### Task 7: Listening player controller and UI

**Files:**
- Create: `src/features/listening/ListeningExam.tsx`
- Create: `src/features/listening/ListeningExam.test.tsx`
- Create: `src/features/listening/ListeningAudioControls.tsx`
- Create tests.
- Modify: `src/app/styles.css`

Behavior:
- custom controls only; no native seeking UI;
- `preload="auto"`;
- Start Listening user gesture;
- Mock: read-only progress + volume; no pause/replay/seek controls;
- Practice: pause/resume, replay current part, seek slider, volume;
- deliberate practice pause opens/closes persisted pause audit;
- progress dispatch is throttled by whole-second changes;
- current question navigation remains independent of audio;
- multi-file part progression attempts autoplay and provides a Continue control if blocked.

### Task 8: Final review and automatic submission

**Files:**
- Modify: Listening player/tests.
- Use persisted `finalReviewStartedAtMs`.

Behavior:
- after final audio ends, enter FINAL REVIEW;
- standard profile = 120 seconds;
- answers/review navigation remain editable;
- audio controls are disabled;
- countdown is restored after refresh;
- expiry submits once.

### Task 9: App/session/results integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/features/results/SessionResult.tsx` if needed.
- Modify: session result composition tests.

Behavior:
- LISTENING becomes a supported player;
- Listening-only published packages launch;
- submit uses existing protected scoring;
- result reports raw Listening score and total questions;
- pause audit summary is displayed for Practice attempts;
- no fabricated overall band for partial-module sessions.

### Task 10: Import workspace Listening path

**Files:**
- Modify: `src/features/importer/ImportWorkspace.tsx`
- Modify: `src/features/importer/ImportWorkspaceContainer.tsx`
- Add Listening semantic review UI bindings by reusing existing generic editors.
- Test: ImportWorkspace Listening integration.

Behavior:
- after module=LISTENING and roles are assigned, build structured Listening review;
- publish button uses Listening publication;
- local catalog refresh exposes the published Listening test;
- unrelated Reading path remains unchanged.

### Task 11: Listening acceptance fixture

**Files:**
- Create: `tests/fixtures/listening-import/fixture.json`
- Create: `tests/fixtures/listening-import/expected-answers.json`
- Create: `src/features/importer/listening/listening-import-acceptance.test.ts`

Acceptance:
- four parts;
- forty questions;
- one or four audio assets;
- representative MCQ, matching, completion and diagram/map-labelling structures;
- 40 protected answers;
- student JSON contains no protected answer definitions;
- controlled objective attempt produces deterministic raw score.

### Task 12: Completion gate

- [ ] Full typecheck.
- [ ] Full test suite.
- [ ] Production build.
- [ ] Update `docs/IMPLEMENTATION_STATUS.md`.
- [ ] PR + merge only when green.
- [ ] Verify Netlify exact merged commit.
- [ ] Resume at Phase C — Writing.
