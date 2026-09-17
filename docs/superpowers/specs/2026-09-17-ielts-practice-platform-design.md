# IELTS Computer Practice Platform — Architecture & Product Design

Date: 2026-09-17
Status: Approved architecture, implementation pending final spec review
Owner: Jaskran
Repository: `jaskran0417/jaskran0417-ielts-computer-practice`

## 1. Product goal

Build a serious, maintainable web application that reproduces the functional interaction model of a modern computer-delivered English proficiency exam for private practice and training-centre use.

The system must support:

- high-fidelity Reading, Listening, and Writing test experiences;
- phone-based administration and import workflows;
- PC/laptop student use;
- Windows 7 compatibility as a deliberate secondary target;
- import of PDFs, scans, images, audio, and answer keys;
- strict multi-pass verification before imported material can be published;
- secure answer keys and server-side scoring;
- autosave and recovery from short network interruptions;
- modular storage so large media can move from Supabase Storage to Cloudflare R2 later without redesigning the application.

The platform must use original branding and assets. It may reproduce the workflow and interaction patterns of IELTS-style computer testing, but must not present itself as an official IELTS product or copy protected logos/trademarks/assets.

## 2. Primary user roles

### Administrator / teacher

Can:

- create and manage tests;
- import source documents;
- upload audio;
- import answer keys;
- inspect extraction evidence;
- resolve verification conflicts;
- preview the test as a student;
- publish/unpublish tests;
- view student attempts and results.

### Student

Can:

- sign in or enter via a future session-code flow;
- take published tests;
- navigate questions using exam-style controls;
- flag questions for review;
- use allowed note/highlight features;
- continue through short network interruptions;
- submit an attempt;
- view results according to teacher/test policy.

## 3. System architecture

```text
Student Exam App                     Admin / Teacher App
        |                                    |
        +----------------+-------------------+
                         |
                    Exam/Test API
                         |
             Universal Test Schema
                         |
      +------------------+------------------+
      |                                     |
 Exam Engine                         Import Pipeline
      |                                     |
Reading / Listening / Writing       PDF / Image / Scan / Audio
      |                                     |
      +------------------+------------------+
                         |
                   Verification Engine
                         |
                       Supabase
            PostgreSQL + Auth + RLS + RPC
                         |
                 Storage abstraction
                  /                 \
        Supabase Storage         Cloudflare R2
             initially              later
```

The Test Player must never depend directly on PDFs, OCR, or import formats. All imported content must be normalized into the Universal Test Schema before the student application sees it.

## 4. Frontend stack

- React 19.x
- TypeScript
- Vite
- CSS with explicit browser-compatibility constraints
- state management chosen during implementation based on engine needs; avoid unnecessary global-state libraries
- IndexedDB for resilient local attempt persistence
- Supabase JS client for authentication and authorized API access

Reason for Vite/React rather than a heavier server-rendering framework: the product is primarily a rich client-side exam application involving timers, audio, independent scrolling, highlight state, question-state transitions, autosave, and document processing.

## 5. Windows 7 compatibility requirement

Windows 7 support is deliberate, not accidental.

### Required target

Primary Windows 7 browser:

- Firefox ESR 115

Secondary best-effort Windows 7 browsers:

- Chrome 109
- Edge 109

Modern browsers on supported operating systems remain the primary environment.

### Build implications

Vite's default production target is newer than Chrome/Edge 109, so production builds must override the default browser target. The project will target at least:

- Chrome 109
- Edge 109
- Firefox 115

The codebase must avoid unsupported APIs or provide tested fallbacks/polyfills when necessary.

Do not rely on:

- bleeding-edge CSS without fallbacks;
- browser APIs unavailable in the target versions;
- build output that assumes only post-2023 browser engines.

### Testing requirement

CI browser tests cover current Chromium/Firefox/WebKit. Windows 7 compatibility additionally requires smoke testing on a real or virtual Windows 7 installation, ideally using Firefox ESR 115.

### Security caveat

Windows 7 itself is end-of-life. Compatibility does not make the operating system secure. The application will support it functionally where practical, but institute administrators should prefer supported operating systems when available.

## 6. Exam shell

A single `ExamShell` hosts all modules and shared behaviors.

Shared state includes:

- attempt ID;
- current module;
- current section/part;
- current question;
- answers;
- visited state;
- review flags;
- notes;
- highlights;
- timer state;
- network/sync state;
- submission state.

Module renderers must not implement separate competing clocks or autosave logic.

## 7. Reading module

Required behavior:

- passage on the left and questions on the right on desktop layouts;
- independent scrolling for passage and question panes;
- three passages / section navigation where applicable;
- direct question-number navigation;
- answered / unanswered / review state indicators;
- change answers until submission/time expiry;
- passage highlighting;
- notes attached to selected text or passage context;
- automatic persistence;
- return to difficult questions;
- full 60-minute timer behavior where the imported test is configured as a standard Reading test.

On narrow mobile screens, the administration interface must remain usable, but the student exam view may warn that a larger screen is recommended for realistic practice.

## 8. Listening module

Required behavior:

- four-part structure when configured as standard IELTS-style Listening;
- forty-question navigation model when applicable;
- volume control;
- no seeking/rewind in exam mode;
- audio preloading before start when possible;
- audio progress driven by the exam state, not arbitrary browser controls;
- review marking;
- automatic answer persistence;
- final review period configurable, with a standard profile supporting two minutes;
- practice mode may optionally allow pause/replay, but this must be clearly separate from Exam Mode.

## 9. Writing module

Required behavior:

- Task 1 / Task 2 navigation;
- 60-minute standard profile;
- prompt visible while typing;
- plain text editor behavior suitable for an exam;
- live word count;
- autosave;
- no Grammarly-style grammar assistance in Exam Mode;
- browser spellcheck/autocomplete disabled where practical in Exam Mode;
- automatic finalization at time expiry;
- Writing-on-Paper simulation may be supported later as a distinct delivery profile.

## 10. Universal Test Schema

Core entities:

- `Test`
- `Module`
- `Section`
- `Passage`
- `QuestionGroup`
- `Question`
- `QuestionOption`
- `AnswerDefinition`
- `MediaAsset`
- `SourceEvidence`
- `VerificationRecord`

Question types initially supported:

- single-choice multiple choice;
- multi-select multiple choice;
- True/False/Not Given;
- Yes/No/Not Given;
- matching headings;
- matching information;
- matching features;
- matching sentence endings;
- short answer;
- sentence completion;
- note completion;
- summary completion;
- table completion;
- flow-chart completion;
- map/plan/diagram labelling;
- writing task prompt.

Question rendering is registry-based. The exam engine knows the question type and delegates rendering to the appropriate renderer.

## 11. Answer model

Answer definitions must support:

- canonical answer;
- allowed alternatives;
- case-sensitivity policy;
- whitespace normalization;
- punctuation policy;
- maximum-word rule;
- number allowance;
- multi-answer sets;
- order sensitivity where required.

Do not use semantic similarity or generative AI to silently mark a materially different response as correct.

## 12. Secure scoring

Correct answers must not be included in the ordinary student test payload before submission.

Flow:

```text
Student response
      |
      v
Authorized scoring endpoint / database function
      |
      v
Protected answer definitions
      |
      v
Scored result
```

Row Level Security must ensure students cannot read protected answer keys, other students' attempts, or unpublished tests.

## 13. Import inputs

Initial supported source formats:

- PDF with text layer;
- scanned PDF;
- mixed text/scanned PDF;
- JPG;
- JPEG;
- PNG;
- WebP;
- MP3;
- WAV;
- M4A where browser/platform decoding is viable;
- answer text pasted manually;
- JSON structured import.

Later:

- DOCX;
- CSV answer keys;
- direct camera scanning workflow;
- other structured formats.

## 14. PDF/image import strategy

### Digital PDF

Use native text extraction. Do not OCR pages unnecessarily.

### Scanned PDF

Render pages to images and run OCR.

### Mixed PDF

Detect per page whether a usable text layer exists and choose native extraction or OCR accordingly.

### Images / camera scans

Preprocessing pipeline may include:

- page-edge detection;
- perspective correction;
- crop;
- rotation correction;
- grayscale;
- contrast enhancement;
- sharpening;
- adaptive thresholding where useful.

Original source imagery must be retained for verification evidence.

## 15. Verification engine

Every imported critical item must preserve evidence and validation results.

Pipeline:

```text
Source
  |
Pass A
  |
Pass B (independent strategy)
  |
Normalization
  |
Structural validation
  |
Cross-check against source geometry
  |
Verification result
```

Verification states:

- `VERIFIED` — independent passes and structural checks agree;
- `CONFIRMED` — human reviewer explicitly confirmed it;
- `REVIEW_REQUIRED` — disagreement or low-confidence critical content;
- `UNREADABLE` — source cannot be read reliably.

Critical instruction conflicts block publishing. Example: `TWO WORDS` vs `THREE WORDS` cannot be silently resolved.

The system must never silently invent unreadable question text or answer-key content.

## 16. Source evidence

Each extracted entity may store:

- source document ID;
- page number;
- normalized bounding rectangle;
- source crop reference;
- extraction method;
- extraction pass results;
- reviewer identity/time where applicable.

Admin review shows original evidence side-by-side with the normalized test content.

## 17. Internet answer verification

External search may be offered only as supporting evidence.

Priority:

1. supplied answer key;
2. independent parsing/extraction agreement;
3. structural validation;
4. optional external-source comparison;
5. human confirmation if conflicting.

A random web answer must never silently overwrite a supplied source answer.

The platform must not scrape or republish copyrighted commercial material without appropriate rights/permission.

## 18. Admin workflow

Test lifecycle:

```text
DRAFT
  -> IMPORTING
  -> REVIEW_REQUIRED / READY
  -> VERIFIED
  -> PUBLISHED
  -> ARCHIVED
```

Publishing is blocked when unresolved critical verification conflicts exist.

Admin screens:

- dashboard;
- new test/import wizard;
- source manager;
- parsed-content editor;
- verification queue;
- side-by-side evidence review;
- student preview;
- publish controls;
- attempts/results.

The entire admin workflow must be usable from an Android phone.

## 19. Resilient attempt persistence

Student answers must use local-first persistence:

```text
User edit
  -> local IndexedDB write
  -> queued remote sync
  -> Supabase acknowledgement
```

If connectivity is lost:

- the test continues;
- the timer continues based on monotonic/local exam-state rules;
- answers remain locally stored;
- sync resumes when connectivity returns.

Submission must include conflict/retry handling so duplicate network requests cannot create duplicate final attempts.

## 20. Backend

Initial backend: Supabase.

Use:

- PostgreSQL for relational test data;
- Supabase Auth;
- Row Level Security;
- Edge Functions or database RPC only where needed;
- Storage for initial media/documents;
- migrations committed to Git.

Expected database groups:

- profiles / roles;
- tests;
- modules;
- sections;
- passages;
- question groups;
- questions;
- question options;
- answer definitions;
- source documents;
- source regions;
- extraction runs;
- verification records;
- test publications / versions;
- attempts;
- attempt responses;
- attempt events;
- scores/results.

## 21. Storage abstraction

All media access goes through a storage-domain interface rather than hard-coding Supabase Storage URLs throughout components.

Initial provider:

- Supabase Storage

Future provider:

- Cloudflare R2

This allows large audio/PDF/image assets to move later without changing the Test Player.

## 22. Versioning and immutability

A published test version must not mutate underneath an active or completed attempt.

Editing a published test creates a new revision/version. Attempts reference the exact version they started.

This is required for trustworthy results.

## 23. Timing model

Timers are centralized in the exam engine.

Use persisted timestamps/state rather than decrementing an in-memory counter as the source of truth.

States:

- `NOT_STARTED`
- `INSTRUCTIONS`
- `ACTIVE`
- `FINAL_REVIEW`
- `SUBMITTING`
- `SUBMITTED`
- `EXPIRED`

Page reload must reconstruct the correct remaining time from persisted session state.

## 24. Accessibility and keyboard behavior

The application should support:

- keyboard navigation where practical;
- visible focus states;
- sufficient contrast;
- semantic controls;
- scalable text;
- reduced-motion preference;
- screen-reader-friendly labels for non-visual controls where this does not conflict with exam simulation requirements.

## 25. Testing strategy

### Unit tests

- answer normalization;
- scoring rules;
- timer calculations;
- schema validation;
- state reducers/state machine;
- verification decision logic.

### Integration tests

- attempt persistence;
- server-side scoring;
- RLS policies;
- importer -> normalized schema;
- publication blocking.

### E2E tests

- Reading navigation/highlight/review/restore;
- Listening audio state and no-seek behavior;
- Writing autosave/word count/task switching;
- offline/online transition;
- refresh/recovery;
- automatic expiry submission;
- permission boundaries.

### Compatibility tests

- current Chrome;
- current Firefox;
- current Edge;
- current Safari/WebKit where practical;
- Firefox ESR 115 on Windows 7;
- Chrome 109 / Edge 109 best-effort smoke tests on Windows 7.

## 26. Repository structure

```text
src/
  app/
  features/
    admin/
    auth/
    exam/
    importer/
    listening/
    reading/
    results/
    verification/
    writing/
  question-types/
  exam-engine/
  test-schema/
  storage/
  database/
  shared/

supabase/
  migrations/
  functions/
  seed/

tests/
  unit/
  integration/
  e2e/

docs/
  architecture/
  specifications/
  superpowers/specs/
```

## 27. Delivery phases

### Phase 1 — foundation + Reading

- project scaffold;
- universal schema;
- auth/roles;
- Reading test player;
- question navigator;
- timer;
- local autosave;
- core question renderers;
- basic manual test builder;
- server-side scoring.

### Phase 2 — importer + verification

- digital PDF extraction;
- image/scanned PDF workflow;
- answer-key import;
- double-pass validation;
- source evidence UI;
- publication blocking.

### Phase 3 — Listening

- audio upload/asset model;
- audio preload;
- exam-mode playback controller;
- listening navigation;
- final review state.

### Phase 4 — Writing

- writing tasks;
- editor;
- word count;
- autosave;
- task navigation.

### Phase 5 — advanced scanning and institute workflows

- camera scan UX;
- image preprocessing;
- session codes;
- teacher reports;
- richer analytics;
- optional external answer verification.

### Phase 6 — storage/deployment optimization

- Cloudflare R2 if/when needed;
- caching/media strategy;
- production monitoring;
- backup/export tooling.

## 28. Non-goals for initial release

- public commercial redistribution of copyrighted test books;
- AI-generated marking of Writing as an authoritative exam score;
- Speaking examination automation;
- pixel-copying official IELTS branding/trademarks;
- unnecessary enterprise microservices;
- artificial user-count limits.

## 29. Definition of success

The first production milestone succeeds when an administrator can, from a phone:

1. create a Reading test;
2. import or enter its content;
3. verify all critical content;
4. publish a version;
5. have a student open it on a PC;
6. take the test using exam-style navigation, timing, highlighting and review behavior;
7. survive a browser refresh or short network interruption without losing answers;
8. submit securely;
9. receive a score based on protected server-side answer definitions;
10. repeat the flow successfully on Firefox ESR 115 under Windows 7 and on a current browser.
