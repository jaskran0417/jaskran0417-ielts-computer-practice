# Reading experience audit — 2026-09-19

## Delivered

The Reading player now has a readiness screen before timing starts, a continuous question pane for each part, part tabs, previous/next navigation, answered counts, a visible save indicator and retry, desktop text-size settings, help, and a mobile Passage/Questions switch. Matching tasks share an interactive option bank with drag/drop and click/keyboard assignment. Completion tasks with explicit blanks put the control in the sentence. Multiple-choice questions retain radio buttons or checkboxes, with selection counts and completeness based on the required count.

Diagram/table groups retain one shared image and all confirmed answers. A deterministic connected-artwork detector can focus the view when one substantial connected region surrounds all answer centres; otherwise the conservative crop remains. Full-image and zoom controls preserve access to source context. This does not infer or confirm answer locations. The anchor editor permits smaller boxes for narrow table cells.

Import corrections preserve paragraph spacing from PDF geometry, join wrapped passage lines, retain wrapped question continuations, recognise sentence/summary/note/flow-chart completion, preserve completion word banks on publication, and require review when an expected bank is missing.

## Question coverage and limits

| Task family | Student interaction | Import limits |
| --- | --- | --- |
| Single choice | Exclusive radio choices | Requires verified option list |
| Multiple selection | Checkboxes, maximum enforced, required-count progress | The existing automatic publisher still blocks unresolved multi-select limits and numbered answer-slot mappings; recognition alone does not make these publishable |
| True/False/Not Given | Exclusive labelled choices | Existing deterministic recogniser |
| Yes/No/Not Given | Exclusive labelled choices | Existing deterministic recogniser |
| Matching headings/information/features/endings | Shared bank, click then place or drag/drop, clear, reuse rule | Existing deterministic recognisers and reviewed banks |
| Sentence/summary/note/flow-chart completion | Inline text gap when the prompt contains an explicit blank; choice control if a word bank exists | Recognition and bank preservation added; arbitrary multi-gap document reconstruction still requires review |
| Short answer | Text response | Word limit remains part of scoring |
| Diagram/table | Shared image, anchored answers, zoom and full context | Confirmed coordinates are still required |

## Verification evidence

- Baseline before edits: 234 tests passed.
- Exact supplied `Reading_Test_1_copy.pdf` (254,577 bytes, 13 pages) uploaded through the actual browser importer. Pages 1–12 assigned question material, page 13 answer key; all eight visual positions set through the UI; automatic publication succeeded with 40 questions.
- Browser checks exercised readiness, Mock start, answer entry, matching assignment, part navigation, saved responses, zoom/full image, and desktop/mobile views.
- At 1440×900 the reading workspace measured 1440×715; at 390×844 the document width remained 390px. No page JavaScript errors were captured.
- Re-import after paragraph/question fixes preserved the first complete paragraph and Q11's wrapped continuation.
- Persistence tests cover failed writes with retry, failed restoration without destructive replacement, and ordered writes when the first save is delayed.
- Full typecheck, test suite and production build are required before merge. Independent reviewer could not run because of a usage limit; author performed the final review.

## Remaining roadmap

This branch improves Reading and shared exam foundations. It does not deliver Listening, Writing, cloud roles/assignments, PWA downloads, portable exam packs or Windows installers. Those remain the ordered phases in IMPLEMENTATION_STATUS.md. The multiple-answer numbered-slot importer/scoring model needs its own implementation and fixtures. Real Windows 7/device testing is still pending; browser viewport simulation is not a hardware compatibility claim.

Sources: [official IELTS Academic task samples](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test), [British Council familiarisation](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/ielts-familiarisation-test). This is an independent IELTS-style practice interface, not an official exam product.
