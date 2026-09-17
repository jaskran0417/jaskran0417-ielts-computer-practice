# Offline + Desktop Delivery Addendum

Date: 2026-09-17
Status: Proposed architecture amendment awaiting user review
Repository: `jaskran0417/jaskran0417-ielts-computer-practice`
Related spec: `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`

## 1. Goal

Extend the approved IELTS practice platform so the same exam engine can run in three delivery forms:

1. normal hosted website;
2. installable offline-capable PWA;
3. Windows desktop application (`.exe`).

Internet must not be required for taking a previously prepared local test, importing local PDFs/images/audio, or using the core exam UI. Internet is optional for cloud sync, backup, remote publishing, optional external answer verification, and multi-device access.

## 2. Shared-core architecture

```text
                         SHARED CORE
                Universal Test Schema
                Exam Engine / Timing
                Question Renderers
                Scoring Rules
                Import Normalization
                Verification Rules
                         |
        +----------------+----------------+
        |                |                |
     Website            PWA          Desktop App
        |                |                |
   Supabase sync    IndexedDB       Local filesystem
   when online      + Cache API      + local database
        |                |                |
        +----------------+----------------+
                         |
                     Sync Layer
                         |
                      Supabase
```

The application must not fork into separate exam implementations. Reading, Listening, Writing, question navigation, timers, review state, highlighting, notes, and scoring semantics remain shared code.

## 3. Website mode

The normal website provides:

- access from modern browsers and the supported Windows 7 browser profile;
- online authentication and institute-level synchronization;
- optional download of tests/media for offline use;
- local persistence while a test is running;
- queued sync when connectivity returns.

The web application must continue operating during temporary internet loss once required test assets are already local.

## 4. PWA mode

The browser application will be installable as a Progressive Web App where the browser supports it.

PWA responsibilities:

- cache the application shell;
- cache/download selected test packages and audio;
- store attempt state locally;
- reopen previously downloaded tests without network access;
- queue cloud synchronization until connectivity returns;
- expose clear storage/download management in the UI.

The PWA is the preferred lightweight offline option because it reuses the website directly and requires no separate desktop installer.

## 5. Desktop application mode

The desktop application will package the same React/Vite frontend and shared domain engine in a desktop shell.

### Modern Windows build

Use a currently supported Electron release for supported Windows versions.

### Windows 7 legacy build

Use a separate legacy desktop packaging profile based on Electron 22.x, because Electron 22 is the final Electron major that runs on Windows 7/8/8.1. Electron 23+ requires Windows 10 or later.

The legacy Windows 7 build must be clearly labeled as a compatibility build. It must not be represented as receiving current Chromium security updates.

The desktop application should support:

- `.exe` installer;
- optional portable build if packaging remains reliable;
- local test library;
- local import from PDF/images/audio;
- local source evidence storage;
- local attempts/results;
- optional later cloud synchronization;
- opening local test-package files directly.

## 6. Local data abstraction

The domain layer must not depend directly on Supabase.

Define local/remote ports such as:

```ts
interface TestRepository {
  getTest(id: string, version: string): Promise<TestPackage>;
  saveTest(test: TestPackage): Promise<void>;
  listTests(): Promise<TestSummary[]>;
}

interface AttemptRepository {
  loadAttempt(id: string): Promise<AttemptState | null>;
  saveAttempt(attempt: AttemptState): Promise<void>;
  listPendingSync(): Promise<AttemptState[]>;
}

interface AssetRepository {
  getAsset(id: string): Promise<Blob>;
  saveAsset(id: string, data: Blob): Promise<void>;
}
```

Implementations:

- web/PWA: IndexedDB + Cache API;
- desktop: local filesystem plus a small local database/index;
- cloud: Supabase adapters.

## 7. Test package format

Add a portable package format, working name: `.exam-pack`.

A package is a versioned archive containing:

```text
manifest.json
content/test.json
media/*
source-evidence/* (optional)
answer-key/* (optional/protected profile)
checksums.json
```

The manifest includes:

- package format version;
- test ID and immutable version ID;
- module metadata;
- required media;
- content hashes;
- creation timestamp;
- compatibility profile;
- whether protected answer data is present.

The package format must be deterministic and versioned so future application versions can migrate older packages safely.

## 8. Offline import

Local import must work without internet for:

- digital PDFs;
- scanned PDFs when browser/desktop OCR resources are available locally;
- JPG/JPEG/PNG/WebP;
- MP3/WAV/M4A where supported;
- pasted/manual answer keys;
- structured JSON packages.

OCR language data/model files required for offline OCR should be downloadable once and then retained locally, or bundled in the desktop application where size is acceptable.

Optional internet lookup is never required for import completion.

## 9. Offline scoring and answer-key security

There are two scoring profiles.

### Cloud-secure profile

- answer keys remain server-side;
- strongest protection against students inspecting local files;
- scoring requires connectivity at final submission or later synchronization.

### Fully offline profile

- answer definitions exist locally so scoring can occur without internet;
- answer data should be stored separately from ordinary student-facing content and protected/obfuscated/encrypted where practical;
- teacher/admin authorization gates answer viewing;
- this cannot provide the same secrecy guarantees as server-side scoring because a determined user with full control of the computer can inspect local application data.

The UI/admin flow must make this trade-off explicit when exporting a fully offline package.

## 10. Offline attempt behavior

Once a test starts locally:

- timers do not depend on server connectivity;
- answers save locally first;
- media loads from local cache/files;
- refresh/app restart reconstructs the attempt;
- submission can be stored as `PENDING_SYNC` if no network exists;
- later sync uses idempotent identifiers so an attempt cannot be duplicated.

## 11. Sync model

Cloud sync is optional and asynchronous.

Each syncable entity includes:

- immutable entity ID;
- revision/version;
- modified timestamp;
- origin device ID;
- sync state.

Published test versions remain immutable. Conflicts in mutable admin drafts must surface for review rather than silently overwriting newer data.

## 12. Import sources from websites

When online, administrators may also import from a URL where legally and technically permitted.

A URL import is simply another source adapter:

```text
URL -> fetch/download -> detect file/content type -> normal import pipeline
```

The system must not depend on remote scraping for core functionality, and it must respect copyright, authentication, and access restrictions.

## 13. Deployment matrix

```text
Platform                 Online      Offline tests     Local import
-------------------------------------------------------------------
Hosted website            Yes        After caching     Yes
Installed PWA             Optional   Yes               Yes
Modern Windows .exe       Optional   Yes               Yes
Windows 7 legacy .exe     Optional   Yes               Yes
```

## 14. Windows 7 desktop caveat

Electron 22 is the last Electron line supporting Windows 7. It embeds Chromium 108 and is end-of-life. The Windows 7 `.exe` therefore exists for functional compatibility, not modern browser security.

Recommended use for the Windows 7 desktop build:

- local/private institute network;
- offline exams;
- trusted local files;
- minimal general web browsing inside the app;
- no arbitrary external navigation.

The Electron shell must disable unrestricted navigation, remote content loading, Node integration in renderer pages, and unnecessary desktop privileges.

## 15. Security boundary

Desktop packaging must follow a strict renderer/main-process boundary:

- renderer runs sandboxed application UI;
- Node integration disabled in renderer;
- context isolation enabled;
- narrow preload bridge only for approved local file/database operations;
- CSP applied to packaged pages;
- arbitrary external URL navigation blocked;
- test packages validated by schema and checksums before import.

## 16. Revised delivery order

### Foundation

Build the platform as offline-capable from the beginning:

1. shared universal schema;
2. deterministic exam engine;
3. repository/storage interfaces;
4. IndexedDB implementation;
5. React exam UI;
6. Supabase synchronization adapter.

### After the first working Reading vertical slice

Add:

7. PWA service worker and downloadable test library;
8. `.exam-pack` import/export;
9. modern Electron desktop shell;
10. Windows 7 Electron 22 compatibility build.

This prevents desktop packaging from dictating the domain architecture while also avoiding a later rewrite for offline support.

## 17. Acceptance criteria

The offline/desktop extension is successful when:

1. a test can be prepared from local files;
2. the test can be downloaded/exported locally;
3. internet can be disconnected;
4. the student can start and finish the test;
5. audio, timer, navigation, answers, review flags, notes/highlights all continue to work;
6. the app/browser can restart and recover the attempt;
7. a completed attempt can remain local or synchronize later;
8. the same test runs through the website/PWA and desktop application with equivalent exam behavior;
9. a Windows 7 compatibility build runs the exam UI using Electron 22.x;
10. no desktop-specific code forks the core exam semantics.
