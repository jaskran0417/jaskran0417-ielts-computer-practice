# Listening Module End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete Listening import, playback, practice/mock control, scoring, result, and recovery path to the shared IELTS practice platform.

**Architecture:** Extend the Universal Test Schema with a Listening module made of four parts, question groups, and audio asset references. Reuse the existing question renderers and protected objective scoring. A dedicated Listening player owns browser media interaction while the session policy decides whether candidate pause/replay/seek controls are enabled; the media element's `currentTime` is playback truth. Audio files are stored as test assets through the same local-first catalog/publication boundary used by Reading.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 5, Testing Library, IndexedDB/idb, browser HTMLAudioElement, existing importer/verification/scoring infrastructure.

**Spec:** `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`

## Global Constraints

- Standard Listening profile: four parts, 40 questions, approximately 30 minutes.
- Recordings are heard once in Mock mode; candidate pause/replay/seek are blocked there.
- Practice mode may expose pause/replay/seek and must audit practice pauses.
- Audio playback position comes from the media element, not a synthetic timer.
- Correct answers stay outside the student test package.
- Existing Reading behavior must not regress.
- Windows 7 browser target remains Firefox ESR 115; Chrome/Edge 109 are best-effort.
- No automatic module detection; administrator selects Listening explicitly.
- Source question/answer/audio roles remain explicit.
- Internet is not required for a previously imported local Listening test.

---

### Task 1: Listening schema and fixture

**Files:**
- Modify: `src/test-schema/types.ts`
- Create: `src/test-schema/sample-listening.ts`
- Test: `src/test-schema/types.test.ts`

**Produces:**

```ts
export interface ListeningModule {
  id: string;
  kind: 'LISTENING';
  title: string;
  parts: ListeningPart[];
}

export interface ListeningPart {
  id: string;
  partNumber: number;
  title: string;
  audioAssetId: string;
  questionGroups: QuestionGroup[];
}

export type StudentModule = ReadingModule | ListeningModule | WritingModule;
```

For this task `WritingModule` is a forward-compatible prompt-only type defined later in the Writing phase; if not yet available, `StudentModule` is `ReadingModule | ListeningModule`.

- [ ] Write a RED schema test constructing four Listening parts with questions 1–40 and audio assets.
- [ ] Run the targeted schema test and confirm the new types are missing.
- [ ] Add Listening module/part types and allow `StudentTestPackage.modules` to contain Reading or Listening.
- [ ] Add a compact synthetic Listening fixture with 4 parts/40 questions and four local audio asset placeholders.
- [ ] Run schema tests + typecheck.

### Task 2: Audio source processing

**Files:**
- Modify: `src/features/importer/local/import-repository.ts`
- Modify: `src/features/importer/local-file-processor.ts`
- Test: `src/features/importer/local-file-processor.test.ts`

**Produces:**
- Audio `SourceDocumentRecord.kind = 'AUDIO'`.
- Retained source bytes and media type for MP3, WAV and M4A-compatible files.
- No OCR/text extraction attempt for audio.

- [ ] Write RED tests for `audio/mpeg`, `audio/wav`, and `audio/mp4`.
- [ ] Run targeted importer tests and confirm audio is rejected/misclassified.
- [ ] Extend source kind/media handling to retain audio bytes safely.
- [ ] Reject unsupported/empty audio with actionable messages.
- [ ] Run importer tests + typecheck.

### Task 3: Listening structuring and answer mapping

**Files:**
- Create: `src/features/importer/listening/types.ts`
- Create: `src/features/importer/listening/listening-structure-parser.ts`
- Test: `src/features/importer/listening/listening-structure-parser.test.ts`
- Create: `src/features/importer/listening/listening-import-converter.ts`
- Test: `src/features/importer/listening/listening-import-converter.test.ts`

**Produces:**
- Explicit 4-part structure from headings such as `Part 1` / `Questions 1-10`.
- Reuses existing question type/instruction/option parsing where the interaction is identical.
- Associates one assigned audio asset with each part, or one full-test audio asset with all parts when explicitly configured.
- Reuses protected `AnswerDefinitionDraft` and answer coverage checks.

- [ ] Write RED fixture tests for 4 parts and ranges 1–10, 11–20, 21–30, 31–40.
- [ ] Add tests for missing audio, duplicate question numbers, and incomplete answers blocking publication.
- [ ] Implement deterministic part/range parsing without module auto-detection.
- [ ] Reuse existing question renderable types for MCQ, matching, map/diagram labels, completion, sentence completion, and short answer.
- [ ] Run converter tests + typecheck.

### Task 4: Listening publication package

**Files:**
- Create: `src/features/importer/publication/listening-publication.ts`
- Test: `src/features/importer/publication/listening-publication.test.ts`
- Modify: `src/test-catalog/local-imported-test-publisher.ts`

**Produces:**
- Student-safe Listening package with audio assets but no answers.
- Protected answers stored separately by version ID.

- [ ] Write RED test proving `JSON.stringify(studentPackage)` has no canonical/protected answers.
- [ ] Write RED test proving 40 mapped objective answers are required.
- [ ] Implement Listening publication preparation.
- [ ] Make local publisher accept a common prepared objective publication shape for Reading or Listening.
- [ ] Run publication/catalog tests.

### Task 5: Audio controller domain

**Files:**
- Create: `src/features/listening/listening-audio-controller.ts`
- Test: `src/features/listening/listening-audio-controller.test.ts`

**Produces:**

```ts
export interface ListeningAudioState {
  status: 'IDLE' | 'READY' | 'PLAYING' | 'PAUSED' | 'ENDED' | 'ERROR';
  currentTimeSeconds: number;
  durationSeconds: number;
  volume: number;
}

export function clampVolume(value: number): number;
export function safeRecoveryPosition(lastSecure: number, mediaDuration: number): number;
```

- [ ] Write RED tests for volume clamp and recovery positions.
- [ ] Implement pure helpers only; browser media remains in the component layer.
- [ ] Run controller tests.

### Task 6: Listening player UI and Mock restrictions

**Files:**
- Create: `src/features/listening/ListeningExam.tsx`
- Create: `src/features/listening/ListeningExam.test.tsx`
- Create: `src/features/listening/ListeningAudioBar.tsx`
- Test: `src/features/listening/ListeningAudioBar.test.tsx`
- Modify: `src/app/styles.css`

**Behavior:**
- Part navigation and question-number navigation.
- Audio preload metadata before start.
- Volume always available.
- Mock: no candidate pause/replay/seek controls.
- Practice: pause/replay/seek controls shown.
- Media events update displayed current position.
- Question answers persist through existing exam reducer/repository.
- Submit locks controls.

- [ ] Write RED UI test for four parts and question navigation.
- [ ] Write RED Mock test proving no pause/replay/seek candidate controls are rendered.
- [ ] Write RED Practice test proving controls are rendered and call the media APIs.
- [ ] Implement audio bar with injected media adapter in tests.
- [ ] Implement Listening player using existing `QuestionRenderer`.
- [ ] Run Listening UI tests + typecheck.

### Task 7: Practice pause audit

**Files:**
- Create: `src/session/attempt-audit.ts`
- Test: `src/session/attempt-audit.test.ts`
- Modify: `src/features/listening/ListeningExam.tsx`

**Produces:**
- Audit accumulation from existing `AttemptAuditEvent` types.
- Practice pause start/end creates a `PRACTICE_PAUSE` event with audio position.
- Mock never records candidate pause because it is unavailable.

- [ ] Write RED audit summarization tests.
- [ ] Implement event summarization.
- [ ] Add player test for one practice pause.
- [ ] Wire event creation into Listening player.
- [ ] Run audit/player tests.

### Task 8: Configurable final review

**Files:**
- Create: `src/features/listening/listening-review.ts`
- Test: `src/features/listening/listening-review.test.ts`
- Modify: `src/features/listening/ListeningExam.tsx`

**Produces:**
- `finalReviewSeconds` profile, default 120 for standard mock profile.
- Audio end transitions to final review when configured.
- Answer changes remain allowed during final review; audio controls stay unavailable.
- Expiry submits automatically.

- [ ] Write RED timing-transition tests.
- [ ] Implement pure review timing helper.
- [ ] Add UI test for audio-ended → final review → submit.
- [ ] Run tests + typecheck.

### Task 9: App/session integration and scoring

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/features/results/SessionResult.tsx`
- Modify tests as needed.

**Behavior:**
- `SUPPORTED_PLAYERS` includes Listening.
- App dispatches Listening vs Reading player based on selected module.
- Listening submit reuses protected objective scoring.
- Result displays raw Listening score and no fabricated overall band.
- Combined Listening+Reading session runs modules sequentially rather than refusing the session.

- [ ] Write RED App test launching a published Listening test.
- [ ] Write RED result test for `35 / 40` Listening.
- [ ] Implement module-player routing.
- [ ] Add sequential selected-module progression for objective modules.
- [ ] Run App/result tests.

### Task 10: Listening import workspace integration

**Files:**
- Modify: `src/features/importer/ImportWorkspace.tsx`
- Modify: `src/features/importer/ImportWorkspace.test.tsx`
- Modify: `src/features/importer/components/ImportSourceManager.tsx`

**Behavior:**
- Listening bundle supports explicit Question Material + Answer Key + Audio roles.
- Structuring/publish stage calls Listening converter.
- Review queue stays semantic; unresolved critical issues block publish.
- Audio source is visible in source manager but not parsed as text.

- [ ] Write RED workspace test for a complete Listening bundle.
- [ ] Write RED missing-audio publication blocker test.
- [ ] Wire Listening converter/publication into workspace.
- [ ] Run importer workspace tests.

### Task 11: Listening recovery

**Files:**
- Modify: `src/storage/indexeddb-attempt-repository.test.ts`
- Modify: `src/features/listening/ListeningExam.test.tsx`

**Behavior:**
- Answers and current question restore after refresh.
- Practice pause audit survives session persistence where audit repository is available.
- Audio resumes only through explicit player recovery policy; no hidden replay in Mock.

- [ ] Write RED restore tests.
- [ ] Implement missing recovery wiring only.
- [ ] Run storage + Listening tests.

### Task 12: End-to-end Listening acceptance and status checkpoint

**Files:**
- Create: `src/features/listening/listening-acceptance.test.ts`
- Create: `tests/fixtures/listening-import/fixture.json`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Acceptance:**
- 4 parts.
- 40 questions.
- 4 audio asset references or one explicitly shared recording.
- Student JSON excludes protected answers.
- Mock has no pause/replay/seek.
- Practice pause is audited.
- Controlled attempt scores deterministically.
- Result contains Listening raw score.
- Full typecheck/tests/build green.

- [ ] Write the acceptance test.
- [ ] Run full CI-equivalent.
- [ ] Update resume checkpoint: Phase B complete, Phase C Writing next.
