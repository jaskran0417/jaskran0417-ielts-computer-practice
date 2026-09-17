# IELTS Computer Practice

A production-oriented computer-based English test practice and test-import platform. The long-term product supports a hosted website, installable PWA, and Windows desktop application while sharing one exam engine and one test schema.

> This is an independent practice platform. It is not affiliated with or endorsed by IELTS, IDP, Cambridge, or the British Council.

## Current milestone

The first vertical slice currently contains:

- React + TypeScript + Vite application shell;
- deterministic, framework-independent exam state engine;
- Reading passage/question split view;
- direct numbered question navigation;
- answered and review states;
- single-choice and gap-fill question renderers;
- timestamp-derived exam timing;
- local-first attempt persistence in IndexedDB;
- Supabase foundation with Row Level Security;
- automated typecheck, unit/integration UI tests, and production build in GitHub Actions.

The content visible in the first build is original development fixture content only. PDF/photo/audio import and verified test conversion are subsequent milestones.

## Browser compatibility

The web build deliberately targets:

- Chrome 109+
- Edge 109+
- Firefox 115+

This keeps the application compatible with the browser versions available on Windows 7 while still supporting current browsers. The later Windows 7 desktop compatibility build will use the same application-level features and shared exam engine as modern Windows.

## Offline-first rule

Core exam state is local-first. A running test does not rely on a continuously available internet connection. Cloud synchronization is an adapter on top of the local exam engine rather than the source of truth for every keystroke.

## Run from GitHub Codespaces on a phone

1. Open this repository on GitHub.
2. Choose **Code → Codespaces → Create codespace on main** (or select the feature branch while developing).
3. In the terminal run:

```bash
npm install
npm run dev
```

4. Open the forwarded Vite port shown by Codespaces.

For a phone browser, Chrome's **Desktop site** mode makes the code editor easier to use.

## Verification commands

```bash
npm run typecheck
npm test -- --run
npm run build
```

GitHub Actions executes these checks for pushes and pull requests.

## Supabase configuration

Copy `.env.example` to `.env.local` and provide:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The application can still start without these values for local/offline development. Do not commit service-role keys or other secrets.

Database changes live in `supabase/migrations/` and are version-controlled. Public tables use Row Level Security. Protected answer definitions are intentionally excluded from the ordinary student test payload.

## Architecture and plans

- Main design: `docs/superpowers/specs/2026-09-17-ielts-practice-platform-design.md`
- Offline/desktop design: `docs/superpowers/specs/2026-09-17-offline-desktop-delivery-design.md`
- Foundation/Reading implementation plan: `docs/superpowers/plans/2026-09-17-foundation-reading-vertical-slice.md`

## Development principles

- one shared exam engine across web/PWA/desktop;
- published test versions are immutable;
- student payloads never contain protected answer keys;
- local saves happen before cloud sync;
- unclear imported content must be reviewed rather than silently guessed;
- production behavior is developed test-first;
- Windows 7 does not receive a reduced feature edition.
