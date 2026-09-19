# Authentic Reading experience

Goal: make the existing Reading player a usable computer-test workspace, with task-specific answering and trustworthy persistence. Continue the existing repository; preserve published tests and answer IDs.

Reference: https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test

The official samples distinguish exclusive/multiple choices, text gaps and matching interactions. This is an independent practice application, not a claim to reproduce every provider's proprietary interface.

## Implementation

1. Add behavioral regressions for continuous part questions, inline completion, matching assignment/reuse, save failure/retry, and visual context controls.
2. Extend completion questions with optional choice lists without invalidating old packages; render explicit blanks inline and keep short answers separate. Matching groups use one bank, support drag/drop plus click/keyboard assignment, and honour option reuse.
3. Show every group in the active part. Add part switching, previous/next question navigation, answered counts, text-size controls and help. Keep passage and question scrolling independent and preserve mobile pane switching. Correct the desktop grid row allocation.
4. Keep image aspect ratios intact at all viewport heights. Add zoom and full-source context controls; retain confirmed anchors, never infer semantic image boundaries from anchors alone.
5. Serialize local saves and report saving/saved/error status with retry. Distinguish Practice/Mock in the header. Keep exam timing and answer locking authoritative in the existing reducer.
6. Run typecheck, full tests, build, and browser checks at desktop/mobile widths. Update IMPLEMENTATION_STATUS.md with actual verified coverage and remaining phases.

## Review focus

- Old packages without completion options must still work.
- Reused matching choices must follow the published task's rule; no answer may move silently.
- Zoom/full-source changes must preserve anchor alignment.
- Delayed writes must not overwrite newer responses; a failed write must never say saved.
- Navigation should reveal the chosen question without jumping on every keystroke.

Listening, Writing, cloud roles, PWA and desktop delivery remain separate roadmap phases. This change completes the current Reading interaction work first, as required by the project checkpoint.
