# Offline + Desktop Delivery Addendum

Date: 2026-09-17
Status: Approved architecture amendment
Repository: `jaskran0417/jaskran0417-ielts-computer-practice`
Related spec: `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`

## 1. Goal

Extend the approved IELTS practice platform so the same exam engine can run in three delivery forms:

1. normal hosted website;
2. installable offline-capable PWA;
3. Windows desktop application (`.exe`).

Internet must not be required for taking a previously prepared local test, importing local PDFs/images/audio, or using the core exam UI. Internet remains fully supported on every platform, including Windows 7, for cloud sync, backup, remote publishing, optional external answer verification, website imports, and multi-device access.

## 2. Feature-parity rule

Modern Windows and Windows 7 must expose the same application-level feature set. The Windows 7 build is not an intentionally reduced or offline-only edition.

Both desktop builds must support, where a feature is enabled by the application configuration:

- Reading, Listening, and Writing;
- local and cloud test libraries;
- online and offline operation;
- local PDF/image/audio import;
- website/URL import when online;
- Supabase synchronization;
- local and cloud results;
- `.exam-pack` import/export;
- optional online verification;
- admin/teacher workflows;
- student workflows.

Differences between modern Windows and Windows 7 are restricted to runtime implementation, browser-engine age, packaging, and compatibility workarounds. Domain semantics, test schema, UI behavior, storage format, and sync protocol remain shared.

## 3. Shared-core architecture

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

The application must not fork into separate exam implementations. Reading, Listening, Writing, question navigation, timers, review state, highlighting, notes, scoring semantics, sync semantics, and package formats remain shared code.

## 4. Website mode

The normal website provides:

- access from modern browsers and the supported Windows 7 browser profile;
- online authentication and institute-level synchronization;
- optional download of tests/media for offline use;
- local persistence while a test is running;
- queued sync when connectivity returns.

The web application must continue operating during temporary internet loss once required test assets are already local.

## 5. PWA mode

The browser application will be installable as a Progressive Web App where the browser supports it.

PWA responsibilities:

- cache the application shell;
- cache/download selected test packages and audio;
- store attempt state locally;
- reopen previously downloaded tests without network access;
- queue cloud synchronization until connectivity returns;
- expose clear storage/download management in the UI.

The PWA is the preferred lightweight offline option because it reuses the website directly and requires no separate desktop installer.

## 6. Desktop application mode

The desktop application will package the same React/Vite frontend and shared domain engine in a desktop shell.

### Modern Windows build

Use a currently supported Electron release for supported Windows versions.

### Windows 7 compatibility build

Use a separate packaging profile based on Electron 22.x, because Electron 22 is the final Electron major that runs on Windows 7/8/8.1. Electron 23+ requires Windows 10 or later.

The Windows 7 build must still support normal HTTPS networking, Supabase synchronization, remote downloads, website imports through controlled application fetch flows, and all other online application features. It must not be treated as offline-only.

The build must be clearly labeled as a compatibility build because its embedded Chromium runtime no longer receives current Chromium security updates.

Both desktop builds should support:

- `.exe` installer;
- optional portable build if packaging remains reliable;
- local test library;
- local import from PDF/images/audio;
- local source evidence storage;
- local attempts/results;
- cloud synchronization while online;
- remote test download/upload;
- website/URL source import through controlled adapters;
- opening local test-package files directly.

## 7. Local data abstraction

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

## 8. Test package format

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

## 9. Offline import

Local import must work without internet for:

- digital PDFs;
- scanned PDFs when browser/desktop OCR resources are available locally;
- JPG/JPEG/PNG/WebP;
- MP3/WAV/M4A where supported;
- pasted/manual answer keys;
- structured JSON packages.

OCR language data/model files required for offline OCR should be downloadable once and then retained locally, or bundled in the desktop application where size is acceptable.

Optional internet lookup is never required for import completion.

## 10. Offline scoring and answer-key security

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

## 11. Offline attempt behavior

Once a test starts locally:

- timers do not depend on server connectivity;
- answers save locally first;
- media loads from local cache/files;
- refresh/app restart reconstructs the attempt;
- submission can be stored as `PENDING_SYNC` if no network exists;
- later sync uses idempotent identifiers so an attempt cannot be duplicated.

## 12. Sync model

Cloud sync is optional and asynchronous.

Each syncable entity includes:

- immutable entity ID;
- revision/version;
- modified timestamp;
- origin device ID;
- sync state.

Published test versions remain immutable. Conflicts in mutable admin drafts must surface for review rather than silently overwriting newer data.

## 13. Import sources from websites

When online, administrators may also import from a URL where legally and technically permitted.

A URL import is another source adapter:

```text
URL -> controlled fetch/download -> detect file/content type -> normal import pipeline
```

The desktop shell must not become a general-purpose embedded browser. Normal external websites remain accessible separately in the user's installed browser; the application itself only fetches or opens external content through explicit, controlled flows.

The system must not depend on remote scraping for core functionality, and it must respect copyright, authentication, and access restrictions.

## 14. Deployment matrix

```text
Platform                 Online      Offline tests     Local import     Cloud sync
--------------------------------------------------------------------------------
Hosted website            Yes        After caching     Yes              Yes
Installed PWA             Yes        Yes               Yes              Yes
Modern Windows .exe       Yes        Yes               Yes              Yes
Windows 7 .exe            Yes        Yes               Yes              Yes
```

## 15. Windows 7 desktop caveat

Electron 22 is the last Electron line supporting Windows 7. It embeds an older Chromium engine and is end-of-life. This is a security-maintenance caveat, not a networking limitation.

The Windows 7 application may connect to the internet normally for approved application features. The Electron shell must still disable unrestricted embedded navigation, untrusted popups, remote code execution, Node integration in renderer pages, and unnecessary desktop privileges.

Users may separately use their installed Windows 7 browser for general web browsing; that is outside the application security boundary.

## 16. Security boundary

Desktop packaging must follow a strict renderer/main-process boundary:

- renderer runs sandboxed application UI;
- Node integration disabled in renderer;
- context isolation enabled;
- narrow preload bridge only for approved local file/database operations;
- CSP applied to packaged pages;
- arbitrary external URL navigation inside the app blocked;
- application networking limited to explicit code paths and configured trusted services;
- test packages validated by schema and checksums before import.

## 17. Revised delivery order

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

## 18. Acceptance criteria

The offline/desktop extension is successful when:

1. a test can be prepared from local files;
2. the test can be downloaded/exported locally;
3. internet can be disconnected;
4. the student can start and finish the test;
5. audio, timer, navigation, answers, review flags, notes/highlights all continue to work;
6. the app/browser can restart and recover the attempt;
7. a completed attempt can remain local or synchronize later;
8. the same test runs through the website/PWA and desktop application with equivalent exam behavior;
9. the Windows 7 compatibility build runs the same feature set using Electron 22.x;
10. the Windows 7 compatibility build can use Supabase and approved internet features when online;
11. no desktop-specific code forks the core exam semantics.
