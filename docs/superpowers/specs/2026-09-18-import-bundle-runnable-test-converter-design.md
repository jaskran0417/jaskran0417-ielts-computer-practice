# Import Bundle → Runnable Test Converter Design

Date: 2026-09-18  
Status: Proposed — user-approved direction, awaiting written-spec review before implementation plan  
Owner: Jaskran  
Repository: `jaskran0417/jaskran0417-ielts-computer-practice`  
Branch: `design/import-bundle-converter`

## 1. Goal

Complete the missing layer between the existing extraction/verification foundation and the actual exam player.

The finished flow must allow an administrator/teacher to:

1. explicitly choose the module being created: Reading, Listening, or Writing;
2. add one or more source files to one import bundle;
3. assign each source, or pages within a PDF, a role such as question material, answer key, audio, writing prompt, or staff-only supporting material;
4. extract text/images/audio locally where possible;
5. structure the extracted material into the Universal Test Schema;
6. map supplied answer keys to the correct questions using protected answer definitions;
7. review every uncertain or conflicting critical field;
8. preview the resulting test as a student;
9. publish an immutable version;
10. create a session from that published test and launch the correct module player;
11. score Reading/Listening attempts from protected supplied answer definitions.

Automatic Reading/Listening/Writing classification is explicitly not required. The administrator chooses the module.

The importer must never treat arbitrary OCR output as a publishable IELTS-style test merely because text was extracted successfully.

## 2. Why this phase exists

The current importer correctly solves the earlier extraction foundation:

- selectable PDF extraction;
- scanned-PDF and image OCR;
- two-pass verification;
- local evidence storage;
- local draft restore;
- answer-key text parsing;
- publication safety primitives.

It does not yet solve semantic test construction.

Today a screenshot can become one generic `OTHER` field, a PDF page can become one generic `PASSAGE_TEXT` field, and the existing Reading player still launches the hard-coded sample test. The missing subsystem must convert verified source evidence into passages, question groups, typed questions, protected answers, and real published tests.

## 3. External reference used for the design

Current official IELTS documentation lists the Reading task families this schema must be able to represent, including:

- multiple choice;
- True/False/Not Given;
- Yes/No/Not Given;
- matching information;
- matching headings;
- matching features;
- matching sentence endings;
- summary/note/table/flow-chart completion;
- diagram label completion;
- short-answer questions.

Current official Listening documentation includes:

- multiple choice;
- matching;
- plan/map/diagram labelling;
- form/note/table/flow-chart completion;
- sentence completion;
- short-answer questions.

Official references consulted on 2026-09-18:

- https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading
- https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening
- https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test

The product reproduces functional interaction patterns with original branding and assets and must not claim to be an official IELTS product.

## 4. Core design decision: import bundles

A single uploaded file is not the unit of a test. An **Import Bundle** is.

### 4.1 ImportBundle

```ts
type ImportModule = 'READING' | 'LISTENING' | 'WRITING';

interface ImportBundle {
  id: string;
  module: ImportModule;
  title: string;
  sources: ImportSourceAssignment[];
  structureDraft: StructuredTestDraft | null;
  verification: BundleVerificationSummary;
  status:
    | 'COLLECTING_SOURCES'
    | 'EXTRACTING'
    | 'STRUCTURING'
    | 'REVIEW_REQUIRED'
    | 'READY_TO_PREVIEW'
    | 'READY_TO_PUBLISH'
    | 'PUBLISHED';
  updatedAtMs: number;
}
```

The module is chosen by the administrator before or while adding sources. No module auto-detection is needed.

### 4.2 Source roles

```ts
type ImportSourceRole =
  | 'QUESTION_MATERIAL'
  | 'ANSWER_KEY'
  | 'AUDIO'
  | 'WRITING_PROMPT'
  | 'STAFF_MARKING_GUIDE'
  | 'SUPPORTING_EVIDENCE';
```

Each source assignment records:

- source document ID;
- role;
- optional page range(s);
- extraction status;
- evidence records;
- whether the source is required for publication.

This permits a single PDF to carry more than one role.

Example:

```text
Reading_Test_1.pdf
  pages 1–12 -> QUESTION_MATERIAL
  page 13    -> ANSWER_KEY
```

The UI must allow the administrator to assign or change these page roles explicitly.

A conservative page-role suggestion may be shown when headings such as "Answers" are present, but suggestions never change the bundle without user confirmation.

## 5. Import workflow

### Step 1 — Choose module

New import starts with:

- Reading
- Listening
- Writing

No inference is needed.

### Step 2 — Add sources

Reading:

- question PDF/image/DOCX/pasted text;
- answer key PDF/image/DOCX/TXT/CSV/JSON/pasted text;
- optional supporting evidence.

Listening:

- question PDF/image/DOCX/pasted text;
- one or more MP3/M4A/WAV files;
- answer key in supported text/document/image formats;
- optional transcript/supporting evidence.

Writing:

- Task 1 and/or Task 2 prompt material;
- optional images/graphs/diagrams that belong to the prompt;
- optional staff-only marking guide or model material;
- no objective answer key is required for automatic scoring.

### Step 3 — Assign source/page roles

For PDFs the admin can assign page ranges.

The importer must not force the user to split a PDF externally just because the answer key is on the last page.

### Step 4 — Extract

Use the already-built adapters:

- PDF text layer when usable;
- OCR for scan-only pages;
- two-pass OCR for images;
- original bytes retained;
- page/region provenance retained.

Future format adapters:

- DOCX;
- structured JSON;
- additional safe text formats.

### Step 5 — Structure

The semantic parser converts verified extraction records into a typed `StructuredTestDraft`.

### Step 6 — Map answers

The answer-key parser creates protected `AnswerDefinitionDraft` records and maps them to question numbers/IDs.

### Step 7 — Review

Uncertain structure, question boundaries, instructions, visual anchors, and answer mappings enter a review queue.

### Step 8 — Student preview

The exact normalized package is rendered through the real question renderers.

### Step 9 — Publish

Publishing creates an immutable test version and protected answer set.

### Step 10 — Run

SessionBuilder selects a published test/version rather than the hard-coded sample test and launches the correct player.

## 6. Structured test draft

The import pipeline must produce a richer intermediate representation before publication.

```ts
interface StructuredTestDraft {
  id: string;
  module: ImportModule;
  title: VerifiedValue<string>;
  sections: StructuredSectionDraft[];
  protectedAnswers: Record<string, AnswerDefinitionDraft>;
  sourceLinks: StructuredSourceLink[];
}
```

A structured field retains both:

- normalized semantic content;
- source evidence pointing back to the exact document/page/region.

The source evidence is not thrown away after structuring.

## 7. Reading structure

A Reading draft contains:

```text
Reading Test
  Passage / Section 1
    Passage title
    Paragraphs / labelled sections
    Question Group A
      instructions
      question type
      questions
    Question Group B
      ...
  Passage / Section 2
  Passage / Section 3
```

The parser must recognize structure from explicit textual evidence such as:

- `Passage 1`;
- `Questions 1-4`;
- `Choose NO MORE THAN TWO WORDS...`;
- `List of Headings`;
- enumerated options;
- statement blocks;
- table/diagram regions.

Question-type recognition is needed. Module recognition is not.

## 8. Reading question types required by this phase

The Universal Test Schema and renderer registry must support at least:

```ts
type ReadingQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE_NOT_GIVEN'
  | 'YES_NO_NOT_GIVEN'
  | 'MATCHING_INFORMATION'
  | 'MATCHING_HEADINGS'
  | 'MATCHING_FEATURES'
  | 'MATCHING_SENTENCE_ENDINGS'
  | 'SHORT_ANSWER'
  | 'SENTENCE_COMPLETION'
  | 'SUMMARY_COMPLETION'
  | 'NOTE_COMPLETION'
  | 'TABLE_COMPLETION'
  | 'FLOW_CHART_COMPLETION'
  | 'DIAGRAM_LABEL_COMPLETION';
```

Question renderers remain registry-based so the exam engine does not contain a giant switch with presentation details.

## 9. Visual questions

The converter must preserve images/diagrams as actual assets, not flatten them into OCR text.

For diagram/map/table/flow-chart questions the structured draft can contain:

```ts
interface VisualQuestionAsset {
  assetId: string;
  sourceDocumentId: string;
  pageNumber: number;
  crop: NormalizedRect;
  intrinsicWidth: number;
  intrinsicHeight: number;
}
```

Interactive target areas are represented separately from the image.

For imported material where exact target geometry cannot be derived confidently, the review UI allows the administrator to position/confirm anchors.

No guessed anchor may silently become verified.

## 10. Uploaded Reading PDF acceptance fixture

The user-supplied 13-page Reading practice PDF becomes the first full acceptance fixture.

A successful conversion of this fixture must create:

- module: Reading;
- 3 passages;
- 40 questions;
- pages 1–12 as question material;
- page 13 as answer-key material;
- no answer key in the student package.

Expected question grouping:

- Questions 1–4: diagram label completion;
- Questions 5–9: matching sentence endings;
- Questions 10–14: True/False/Not Given;
- Questions 15–19: short answer;
- Questions 20–24: matching headings;
- Questions 25–27: single-choice multiple choice;
- Questions 28–31: table completion;
- Questions 32–36: matching information;
- Questions 37–40: matching features/people.

The fixture must be used in integration tests without publishing or redistributing its copyrighted source outside the user's own project context.

## 11. Semantic structure parser

The parser is split into small deterministic recognizers rather than one opaque classifier.

Suggested units:

```text
DocumentOutlineParser
QuestionRangeParser
InstructionParser
OptionListParser
PassageParser
QuestionTypeRecognizers
VisualRegionLinker
AnswerKeyStructureParser
QuestionAnswerMapper
```

Each recognizer returns:

```ts
interface StructureCandidate<T> {
  value: T | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: SourceEvidence[];
  reasons: string[];
}
```

Only high-confidence deterministic findings may auto-advance.

Medium/low confidence creates review items.

## 12. Question type recognition rules

The recognizers use explicit instructions and structural patterns.

Examples:

- `True / False / Not Given` instruction -> `TRUE_FALSE_NOT_GIVEN`;
- `Yes / No / Not Given` -> `YES_NO_NOT_GIVEN`;
- `Choose the correct heading` + headings list -> `MATCHING_HEADINGS`;
- `Match each ... with the correct person` -> `MATCHING_FEATURES`;
- `correct ending A-I` -> `MATCHING_SENTENCE_ENDINGS`;
- `Choose ... A, B, C or D` -> `SINGLE_CHOICE`;
- `NO MORE THAN ... WORDS` plus direct question prompts -> short-answer/completion family;
- table geometry + numbered blank cells -> `TABLE_COMPLETION`;
- diagram image + numbered blanks -> `DIAGRAM_LABEL_COMPLETION`.

The parser must preserve the original instruction text in addition to deriving machine-readable constraints.

## 13. Answer-key import and mapping

The answer key is a separate protected semantic stream.

```ts
interface AnswerDefinitionDraft {
  questionId: string;
  questionNumber: number;
  kind:
    | 'OPTION'
    | 'TEXT'
    | 'ENUM'
    | 'MULTI_OPTION'
    | 'MULTI_TEXT';
  canonical: string | string[];
  alternatives: string[][];
  normalization: AnswerNormalizationPolicy;
  sourceEvidence: SourceEvidence[];
  verificationState: VerificationState;
}
```

Question number is the primary mapping key during import.

After publication, immutable question ID is authoritative.

## 14. Answer expression parser

Supplied keys often contain shorthand such as:

- `(The) corona`;
- `(strict) quarantine`;
- `(around) six/6 years`;
- `ninety/90 percent/per cent/%`.

The answer parser must not store that raw shorthand as one literal correct string.

It converts unambiguous shorthand into explicit accepted forms.

Example:

```text
(The) corona
-> "corona"
-> "the corona"
```

Example:

```text
(around) six/6 years
-> "six years"
-> "6 years"
-> "around six years"
-> "around 6 years"
```

Ambiguous slash/parenthetical syntax becomes `REVIEW_REQUIRED` rather than being expanded aggressively.

## 15. Answer normalization policy

Per question:

```ts
interface AnswerNormalizationPolicy {
  caseSensitive: boolean;
  collapseWhitespace: boolean;
  punctuation: 'STRICT' | 'IGNORE_TERMINAL' | 'LENIENT';
  maxWords?: number;
  numbersAllowed?: boolean;
  orderSensitive?: boolean;
}
```

For completion/short-answer tasks the importer derives `maxWords` and number allowance from the verified instruction.

Word-limit enforcement belongs to scoring validation as well as UI guidance.

Semantic similarity or a generative model must never silently mark a materially different answer correct.

## 16. Scoring architecture

Student package:

```text
question text
options
instructions
assets
NO protected answers
```

Protected package:

```text
questionId -> AnswerDefinition
```

Online scoring:

```text
student response
  -> authenticated scoring RPC / server endpoint
  -> protected AnswerDefinition
  -> normalized comparison
  -> correct / incorrect / invalid-by-instruction
  -> raw score
```

Each objective Reading/Listening question normally contributes one raw mark unless the test profile explicitly defines otherwise.

Writing is not automatically converted into an authoritative band score.

## 17. Answer coverage gate

A Reading or Listening test cannot be published as auto-scorable unless every objective question has either:

- a verified answer definition; or
- an explicitly confirmed answer definition.

Missing, duplicated, or conflicting question numbers block publication.

Examples of publication blockers:

- questions 1–40 parsed but answer 17 missing;
- two different supplied keys disagree on answer 25;
- word-limit instruction is unresolved;
- answer key maps to a nonexistent question;
- one visual question is missing its required asset/anchor.

## 18. External internet evidence

Internet use is optional supporting evidence, never the authority that silently replaces the supplied key.

Priority remains:

1. supplied answer key;
2. independent extraction/answer parsing agreement;
3. structural validation against question/instruction;
4. consistency with the supplied passage/transcript;
5. optional external public-source evidence;
6. human confirmation for unresolved conflict.

Introduce an interface:

```ts
interface ExternalEvidenceProvider {
  verify(request: ExternalEvidenceRequest): Promise<ExternalEvidenceResult[]>;
}
```

Initial safe capability can use explicitly supplied public URLs and approved public sources.

General web-search integration remains provider-backed and configurable; the core importer must work without it.

External evidence records:

- source URL;
- retrieval timestamp;
- relevant excerpt/hash/claim summary;
- which imported field it supports or contradicts;
- confidence/provenance.

External evidence can change `UNKNOWN` to "more evidence available", but cannot directly change a conflicting supplied answer into `VERIFIED`.

## 19. Public URL safety

Any future server-side URL fetch must protect against:

- localhost/private-network SSRF;
- redirects to private IPs;
- DNS rebinding;
- unsupported schemes;
- excessive content length;
- dangerous content types;
- recursive crawling;
- authentication bypass attempts.

The importer follows only the explicitly supplied page/file and intentionally linked relevant assets under the approved URL-import policy.

## 20. Listening import bundle

Listening does not require module inference.

Admin selects Listening and supplies:

- question source;
- answer key;
- audio.

One full recording or multiple part recordings can be supported.

```ts
interface ListeningPartDraft {
  id: string;
  partNumber: number;
  questionRange: [number, number];
  audioAssetId: string;
  audioRange?: { startSeconds: number; endSeconds?: number };
}
```

A single full-test recording does not require guessed question timestamps.

Audio `currentTime` remains playback truth.

Question navigation is independent of audio.

Mock mode blocks candidate pause/replay/seek. Practice mode may enable them according to configuration and logs pauses.

Listening uses the same protected answer-definition/scoring system as Reading.

## 21. Writing import bundle

Admin selects Writing.

The importer structures:

- Task 1 prompt;
- Task 1 visual asset if present;
- Task 2 prompt;
- task instructions;
- Academic/General Training profile metadata when supplied.

Writing answer keys are not objective scoring keys.

Optional staff material is stored as `STAFF_MARKING_GUIDE` and never student-visible before/while taking the task unless explicitly configured as post-attempt feedback.

Computer and Paper delivery profiles reuse the same prompt structure.

## 22. Publish boundary

The current UI button "Publish imported test" must stop being a local-only affordance.

The final publish flow:

```text
ImportBundle
  -> structured draft validation
  -> verification gate
  -> student-safe package generation
  -> protected-answer package generation
  -> Supabase transaction/RPC
  -> immutable test_version
  -> publication record
  -> local/cloud library refresh
```

The database publication guard remains a final defense-in-depth check.

## 23. Test library and session integration

SessionBuilder must no longer be hard-wired to `sampleReadingTest`.

Add a test library/selection boundary:

```ts
interface TestCatalogRepository {
  listPublishedTests(): Promise<TestSummary[]>;
  loadPublishedTest(testId: string, versionId: string): Promise<StudentTestPackage>;
}
```

Session setup becomes:

```text
Select published test
  -> choose module subset where applicable
  -> choose Practice / Mock
  -> choose Writing delivery when relevant
  -> create session with exact testId + versionId
  -> load package
  -> launch module player
```

## 24. Schema evolution

The current schema only models Reading and only two question types.

Extend it without breaking existing Reading fixtures.

Recommended structure:

```ts
interface StudentTestPackage {
  id: string;
  versionId: string;
  title: string;
  modules: StudentModule[];
}

type StudentModule =
  | ReadingModule
  | ListeningModule
  | WritingModule;
```

Each question type gets its own discriminated interface.

Shared fields:

- ID;
- number;
- prompt;
- source-independent interaction metadata;
- instruction constraints;
- assets;
- accessibility label metadata.

Protected answer definitions remain outside this package.

## 25. Review UX

Review must operate on semantic items, not giant OCR blobs.

Queue examples:

```text
Passage 1 title
Questions 1–4 instruction
Q1 diagram anchor
Q5 option G text
Q10 TFNG statement
Q17 accepted answer alternatives
Q28 table blank position
Q31 answer mapping
```

Each review item shows:

- normalized value;
- source page/crop;
- extraction pass A/B;
- structural interpretation;
- answer-key evidence if applicable;
- optional external evidence;
- confirm/edit/reject controls.

"CONFIRMED" always means an explicit human action.

## 26. Random-source behavior

An arbitrary screenshot may still be imported as source evidence, but it must not automatically become a valid publishable test.

If required structure is absent, the structuring stage reports:

```text
No complete test structure could be created.
Missing: passage/question groups/question numbers/etc.
```

The source remains in the draft for manual use, but publication remains blocked.

## 27. Error handling

No silent fallbacks for critical structure.

Examples:

- unreadable question number -> review;
- missing option list -> review;
- two possible question types -> review;
- duplicated answer number -> review;
- answer-key OCR disagreement -> review;
- visual crop missing -> review;
- unsupported DOCX feature -> preserve source and explain;
- audio decode failure -> block Listening publish, retain source.

Every error should be actionable and tied to source evidence.

## 28. Offline behavior

Core local conversion remains usable without internet once runtime assets are present.

Offline-capable:

- PDF text extraction;
- PDF page rendering;
- image OCR;
- deterministic structuring;
- answer parsing/mapping;
- semantic review;
- local preview;
- local draft recovery.

Cloud publication, cloud-secure scoring, URL import, and external web evidence require internet.

## 29. Security

- student packages contain no correct answers;
- answer definitions use staff-only RLS policies;
- unpublished source documents are staff-only;
- published versions are immutable;
- students can read only published student-safe content and their own attempts/results;
- answer-key source images/PDF pages are not delivered to student clients;
- server-side score calculation reads protected answers under controlled authorization.

## 30. Implementation decomposition

This architecture is too large for one undifferentiated coding pass. Implement in vertical slices.

### Slice A — Import bundle + manual module/source roles

- ImportBundle domain;
- module selector;
- multiple sources;
- PDF page-role assignment;
- existing extraction adapters reused;
- draft persistence migration.

### Slice B — Reading structuring + fixture conversion

- outline/passage/question-range parser;
- Reading question type recognizers;
- schema expansion;
- all required Reading renderers;
- uploaded 40-question PDF acceptance fixture.

### Slice C — answer-key mapping + protected scoring

- answer expression parser;
- answer coverage gate;
- protected answer definitions;
- Supabase publish transaction;
- scoring RPC/domain;
- results integration.

### Slice D — test library + real session launch

- published test catalog;
- replace hard-coded sample launch;
- exact immutable version load;
- student preview and session selection.

### Slice E — Listening import/player completion

- audio assets;
- Listening structure;
- player/recovery/policies;
- protected scoring.

### Slice F — Writing import/player completion

- Task 1/2 parsing;
- visual prompts;
- computer/paper delivery;
- teacher marking state.

### Slice G — optional online evidence + URL import

- safe public URL adapter;
- external evidence provider;
- conflict presentation;
- SSRF/redirect/content controls.

Each slice gets TDD, full typecheck/test/build verification, and a reviewable branch/PR.

## 31. Test strategy

### Unit

- instruction parser;
- question-range parser;
- question-type recognizers;
- option parser;
- answer shorthand expansion;
- word-limit policy;
- answer mapping;
- scoring normalization.

### Fixture integration

The uploaded Reading PDF fixture must assert:

- 3 passages;
- 40 questions;
- exact group ranges;
- expected types for each range;
- page 13 separated as protected answer source;
- 40 answer definitions;
- no answer definition in student JSON;
- visual assets retained for Q1–4;
- table structure retained for Q28–31.

### UI integration

- manual module selection;
- multiple source assignment;
- page-role assignment;
- conflict review;
- student preview;
- publish blocked/unblocked;
- published test appears in session selection.

### Backend

- answer-key RLS;
- publication transaction;
- immutable versions;
- server-side scoring;
- student cannot select protected answer rows.

### E2E

```text
import supplied Reading PDF
-> assign pages 1-12 questions, 13 answers
-> resolve any review items
-> preview
-> publish
-> select published test
-> start Reading
-> answer questions
-> submit
-> receive raw score
```

## 32. Acceptance criteria for this architecture phase

The converter phase is successful when the following is true for the supplied Reading fixture:

1. admin chooses Reading manually;
2. uploads the 13-page PDF;
3. assigns pages 1–12 to question material and page 13 to answer key;
4. system extracts and structures three passages;
5. system structures all 40 questions into their correct interaction types;
6. diagram/table assets remain usable, not reduced to plain OCR text;
7. answer-key notation becomes explicit protected accepted answers;
8. every answer is mapped to the correct question;
9. uncertainty is shown for review rather than silently guessed;
10. student preview contains no correct-answer data;
11. publish writes an immutable version;
12. the published test appears in the test/session selector;
13. starting the session launches the imported Reading test, not the sample fixture;
14. submission scores against the protected supplied key;
15. result shows correct/incorrect/raw score without exposing protected key before submission;
16. the same import draft remains recoverable locally after refresh;
17. core conversion remains functional offline;
18. optional internet evidence can support review but cannot override the supplied key silently.

## 33. Non-goals for this phase

- automatic module detection;
- authoritative AI Writing marking;
- automatic Speaking evaluation;
- unrestricted web crawling;
- semantic-similarity scoring for objective answers;
- silently correcting the user's supplied key from internet results;
- copying official IELTS logos or proprietary assets into the product;
- pretending every arbitrary image is a complete test.

## 34. Decisions locked by this design

- Module is selected by the administrator.
- Import unit is a bundle, not one file.
- Same PDF may contain question and answer pages.
- Answer keys are protected and separate from student payloads.
- Question types are structured before publish.
- Supplied key outranks web evidence.
- Internet is optional evidence, not required for core import.
- Uncertain critical structure always requires review.
- Published versions are immutable.
- Session launch uses published imported tests, never a hard-coded fixture in production.
