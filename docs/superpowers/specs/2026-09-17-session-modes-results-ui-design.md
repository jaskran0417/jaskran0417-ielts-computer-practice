# Session Modes, Results, and Modern UI Design

## Purpose

This design adds institute-friendly session configuration, realistic mock-test behavior, flexible practice behavior, optional paper-Writing handling, result reporting, and a modern application shell around the existing exam engine.

It intentionally separates the **platform UI** from the **exam player UI**:

- The platform UI should feel like a polished modern web application: dense where useful, responsive, fast, searchable, accessible, and designed for desktop and mobile rather than looking like a generic collection of cards.
- The exam player should be focused and exam-like, with minimal distractions and module-specific controls.

The project must not copy IELTS, GitHub, or any other product's protected visual assets or branding. It may reproduce documented candidate-facing behavior and use mature interaction patterns such as side navigation, searchable lists, command/search affordances, status indicators, context menus, responsive tables, drawers, and keyboard-friendly navigation.

## Core Decisions

### 1. Modules are selectable per session

A teacher or student may create a session with any supported module combination:

- Listening only
- Reading only
- Writing only
- Listening + Reading
- Listening + Writing
- Reading + Writing
- Listening + Reading + Writing

Speaking is outside the first implementation slice but the session model must leave room for it.

A session stores the selected modules explicitly and only launches those modules. A module not selected for a session is displayed in results as **Not included**, not as failed, skipped, or zero.

A partial-module session must never be labeled as a full IELTS overall result.

### 2. Two primary attempt modes

#### Practice Mode

Practice Mode is designed for learning and classroom explanation.

Allowed capabilities may include:

- pause Listening audio;
- resume Listening audio;
- replay relevant audio;
- seek within permitted practice audio;
- show answers after an attempt or when teacher configuration allows it;
- show explanations and source references after submission;
- practice only selected modules;
- continue an interrupted local attempt.

Every deliberate candidate pause is recorded as audit data:

- pause sequence number;
- start time;
- end time;
- duration;
- audio position when applicable;
- module;
- reason/type when available.

Pauses do not automatically reduce a score. The report clearly states the conditions under which the attempt was completed.

#### Mock Mode

Mock Mode is designed to reproduce exam-like restrictions.

For Listening:

- candidate pause is disabled;
- candidate rewind/replay is disabled;
- seeking backward/forward is disabled;
- restart from the beginning is disabled;
- volume control remains available;
- question navigation remains independent of audio progress;
- the audio timeline continues even if the candidate navigates to another question;
- the final review phase is handled by the module state machine rather than by replaying audio.

For Reading and Writing:

- the configured exam timer continues according to persisted timestamps;
- answers remain editable until submission or expiry unless a future rule explicitly restricts them;
- review/navigation controls remain available according to the module design.

### 3. Technical interruption is distinct from candidate pause

The system must model a technical interruption separately from a Practice Mode pause.

Examples:

- audio device disconnected;
- browser/app crash;
- power loss;
- teacher-authorized emergency stop;
- local device failure.

A technical interruption record stores:

- module;
- start time;
- end time;
- duration;
- last secure audio position if Listening;
- recovery position;
- source of interruption (`SYSTEM`, `TEACHER`, or another explicit enum value);
- optional teacher/admin note.

Mock Mode must not expose a normal candidate Pause button merely because technical recovery exists.

### 4. Writing delivery can be computer or paper

When Writing is included, the session chooses a delivery mode:

- `COMPUTER`
- `PAPER`

#### Computer Writing

The student uses the in-app Writing editor with the established Writing experience: task switching, prompt display, autosave, timer, and word count where applicable.

#### Paper Writing

The app still runs the Writing module and timer and displays Task 1 / Task 2 prompts, but does not require a typed response.

At the end of the Writing module, handwritten pages may be uploaded from the web/app, but upload is **optional**.

Available post-task actions include:

- Upload Task 1
- Upload Task 2
- Skip for now
- Mark as externally assessed

Skipping upload must never block Listening or Reading results and must never prevent the session from completing.

If paper Writing is completed but not uploaded, the report should state:

**Writing completed on paper — not submitted to app**

A later upload attaches evidence to the existing attempt rather than creating a new attempt.

### 5. Writing scoring remains pending until assessed

Reading and Listening may be machine-scored when answer definitions are available and the attempt is submitted.

Writing is not assigned an authoritative score merely because text or handwritten pages exist.

Writing result states include at least:

- `NOT_INCLUDED`
- `COMPLETED_PENDING_MARKING`
- `COMPLETED_NOT_UPLOADED`
- `MARKED`

Teacher/examiner assessment may later provide the Writing band and criteria breakdown.

Automated analysis may assist in a future phase but must not silently become the authoritative Writing score.

### 6. Result model distinguishes module results from overall results

A result page must work for partial sessions and full sessions.

For a partial session such as Listening + Reading:

- show Listening result;
- show Reading result;
- show Writing as Not included;
- do not display a full overall IELTS band.

For a full configured session where one component remains unmarked:

- show the available component results immediately;
- show Writing as pending;
- show overall status as pending rather than inventing a total.

A complete final report may include:

- raw score where applicable;
- band conversion where supported by the configured scoring rules;
- time used;
- answered/unanswered counts;
- review flags;
- answer-change count;
- Practice pause count and total paused duration;
- technical interruption count and duration;
- recovery events;
- Writing delivery mode;
- Writing upload/marking state;
- session mode (`PRACTICE` or `MOCK`);
- selected modules.

The report may describe the attempt conditions, for example that Practice Mode included pauses. It must not automatically penalize the academic score merely because a practice control was used.

### 7. Session is a first-class institute concept

The platform must distinguish a reusable test from a scheduled or assigned session.

A `Test` is reusable assessment content.

A `Session` is a configured delivery of that test and includes at least:

- selected test/version;
- selected modules;
- mode (`PRACTICE` or `MOCK`);
- Writing delivery mode when Writing is selected;
- assigned students or audience metadata in future institute flows;
- optional start window / schedule metadata;
- created-by identity when online auth is present;
- local/offline compatibility.

A teacher should be able to create sessions for classroom use without cloning the underlying test content.

## Listening State and Pause Audit

Listening must use audio playback position as the synchronization authority for audio-related state rather than a decrement-only UI counter.

The attempt state machine must distinguish at least:

- `READY`
- `PLAYING`
- `PRACTICE_PAUSED`
- `TECHNICAL_INTERRUPTION`
- `FINAL_REVIEW`
- `SUBMITTED`

Mock Mode never enters `PRACTICE_PAUSED` from a candidate action.

Practice Mode pause behavior must preserve the audio position and append an audit event.

Recovery after interruption must not allow an accidental replay exploit in Mock Mode. The recovery policy should resume from a stored secure position adjusted according to the chosen interruption policy, rather than restarting audio from zero.

The exact recovery adjustment algorithm can remain configurable, but the implementation must preserve the distinction between a user pause and a technical interruption.

## Platform UI Architecture

### Application shell

The non-exam application uses a responsive shell with areas such as:

- Dashboard
- Tests
- Sessions
- Students
- Results
- Import
- Settings

The first implementation slice may expose only the sections that have real backing features, but the navigation architecture must not require a rewrite to add the remaining sections.

### Interaction quality

The application should use modern interaction patterns:

- responsive side navigation on desktop;
- compact mobile navigation/drawer on small screens;
- fast search and filtering for lists;
- proper loading skeletons rather than layout jumps;
- explicit empty states;
- compact status badges;
- contextual actions instead of oversized repeated buttons;
- autosave/status indicators;
- accessible focus states;
- keyboard navigation where it materially improves speed;
- responsive tables that become appropriate mobile list/detail views rather than squeezed desktop tables;
- restrained motion that communicates state without distracting the user;
- no unnecessary full-page reloads.

The interface should look deliberate and product-grade, not like a generic dashboard template.

### Visual system

Use one consistent application design system with:

- spacing scale;
- typography scale;
- border/radius rules;
- surface/elevation rules;
- semantic status tokens;
- input/control sizing;
- desktop/mobile breakpoints;
- motion durations;
- focus/hover/pressed/disabled states.

Do not scatter arbitrary visual values across feature CSS.

The system must remain compatible with the project's browser floor, including Firefox ESR 115 and best-effort Chrome/Edge 109 support for Windows 7.

## Exam Player UI Architecture

The exam player is visually and structurally separate from the platform shell.

Entering an active exam hides normal dashboard navigation and presents a focused test environment.

Reading retains its split passage/question workspace.

Listening presents the current question workspace and audio controls appropriate to the selected mode.

Writing presents either:

- prompt + editor for computer delivery, or
- prompt + timer + paper-delivery guidance for paper delivery.

Mock Mode must not expose Practice-only controls in a disabled-but-tempting way where hiding them is clearer. Practice Mode may show extra learning controls with clear labels so the student understands that the conditions are not exam-equivalent.

## Offline-First Behavior

Creating and taking a locally available session must not require internet.

Core session configuration, module selection, timers, Listening controls, answer storage, pause/interruption audit events, and local results persist locally first.

When Supabase is configured and internet is available, durable session/attempt/result records may synchronize using the project's existing local-first strategy.

Internet loss during a locally prepared attempt must not stop the exam player.

## Security and Integrity

- Student-safe test payloads must not expose protected answer definitions.
- Practice Mode answer reveal happens only after the configured reveal condition.
- Mock Mode never exposes correct answers during the attempt.
- Published test content remains immutable; sessions reference an exact test version.
- Result calculations reference the exact test version and scoring configuration used for the attempt.
- Audit events are append-oriented; later reporting must not rewrite history to make a Practice attempt look like an uninterrupted Mock attempt.

## Initial Domain Model

The implementation should introduce or evolve types equivalent to:

```ts
export type ModuleKind = 'LISTENING' | 'READING' | 'WRITING';
export type SessionMode = 'PRACTICE' | 'MOCK';
export type WritingDelivery = 'COMPUTER' | 'PAPER';

export interface SessionConfig {
  id: string;
  testId: string;
  testVersionId: string;
  modules: ModuleKind[];
  mode: SessionMode;
  writingDelivery?: WritingDelivery;
  createdAtMs: number;
}

export type AttemptAuditEvent =
  | {
      type: 'PRACTICE_PAUSE';
      module: ModuleKind;
      startedAtMs: number;
      endedAtMs: number;
      audioPositionSeconds?: number;
    }
  | {
      type: 'TECHNICAL_INTERRUPTION';
      module: ModuleKind;
      startedAtMs: number;
      endedAtMs: number;
      lastSecureAudioPositionSeconds?: number;
      recoveryAudioPositionSeconds?: number;
      source: 'SYSTEM' | 'TEACHER';
      note?: string;
    };
```

The exact storage representation may evolve, but these semantic distinctions must remain explicit.

## First Implementation Slice

This architecture is broader than one commit. The first slice should be independently usable and testable:

1. session configuration domain and validation;
2. module selection UI;
3. Practice vs Mock mode configuration;
4. computer vs paper Writing selection;
5. session launch that starts only the selected modules;
6. Practice pause audit model and Mock-mode restriction boundary;
7. result summary that correctly handles partial sessions and pending Writing;
8. modern application shell/design tokens around the session/test workflow;
9. tests proving invalid combinations and protected Mock behaviors.

Listening replay/seek UI, full Writing editor implementation, teacher assignment workflows, handwritten upload storage, advanced analytics, and Speaking are separate follow-up slices unless already implemented by another approved subsystem.

## Validation Rules

At minimum:

- `modules` must contain at least one unique supported module;
- `writingDelivery` is required when Writing is selected;
- `writingDelivery` must be absent or ignored when Writing is not selected;
- Mock Listening must reject candidate pause/replay/seek actions at the domain level, not only hide buttons;
- Practice Listening may record pause events;
- a partial session must not produce an overall full-test band;
- skipped paper-Writing upload must not block session completion;
- student-facing results must not expose protected answer definitions;
- session configuration must survive local persistence and reload.

## Acceptance Criteria for This Design

The design is considered correctly implemented when a teacher can create a session such as **Listening + Reading / Mock**, a student can launch only those two modules, Mock Listening cannot be candidate-paused, and the result page shows Listening and Reading while clearly marking Writing as Not included and omitting a full overall band.

It is also correctly implemented when a teacher creates **Writing / Paper / Practice**, the student can complete the timed Writing module without typing, skip handwritten upload, complete the attempt successfully, and later attach handwritten pages without creating a second attempt.

The platform shell and session flow must be responsive and polished enough to serve as the permanent UI foundation rather than a disposable prototype.