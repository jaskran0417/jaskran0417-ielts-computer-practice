import { describe, expect, it } from 'vitest';
import fixture from '../../../../tests/fixtures/reading-import/fixture.json';
import expectedAnswers from '../../../../tests/fixtures/reading-import/expected-answers.json';
import { mapAnswersToQuestions } from '../answers/question-answer-mapper';
import { prepareReadingPublication } from '../publication/import-publication';
import { buildSemanticReviewQueue } from '../review/semantic-review';
import { scoreObjectiveAttempt } from '../../../scoring/score-objective-attempt';
import type { MediaAsset, StudentQuestion } from '../../../test-schema/types';
import { buildStructuredReadingDraft } from './reading-structure-parser';
import type {
  ImportedVisualRegion,
  ReadingSourceBlock,
  VisualAnchorDraft,
} from './types';

function sourceBlocks(): ReadingSourceBlock[] {
  return fixture.blocks.map((block) => ({
    ...block,
    evidence: [
      {
        documentId: 'reading-pdf',
        pageNumber: block.pageNumber,
        method: 'PDF_TEXT' as const,
      },
    ],
  }));
}

function visualRegions(): ImportedVisualRegion[] {
  return [
    {
      id: 'diagram-page-3',
      sourceDocumentId: 'reading-pdf',
      pageNumber: 3,
      kind: 'DIAGRAM',
      crop: { x: 0.1, y: 0.2, width: 0.8, height: 0.5 },
    },
    {
      id: 'table-page-11',
      sourceDocumentId: 'reading-pdf',
      pageNumber: 11,
      kind: 'TABLE',
      crop: { x: 0.05, y: 0.45, width: 0.9, height: 0.4 },
    },
  ];
}

function allDraftQuestions(
  draft: ReturnType<typeof buildStructuredReadingDraft>,
) {
  return draft.sections.flatMap((section) =>
    section.questionGroups.flatMap((group) => group.questions),
  );
}

function allStudentQuestions(
  questions: StudentQuestion[][],
): StudentQuestion[] {
  return questions.flat();
}

describe('Reading import acceptance', () => {
  it('converts the synthetic 13-page structure into a safe 40-question runnable Reading test', () => {
    const regions = visualRegions();
    const structuredDraft = buildStructuredReadingDraft({
      blocks: sourceBlocks(),
      visualRegions: regions,
    });
    structuredDraft.title = 'Reading Test 1';

    const questions = allDraftQuestions(structuredDraft);
    expect(structuredDraft.sections).toHaveLength(3);
    expect(questions).toHaveLength(40);

    const answerEntries = questions.map((question) => ({
      questionNumber: question.number,
      raw: expectedAnswers[String(question.number) as keyof typeof expectedAnswers],
      constraints: question.instructionConstraints,
      evidence: [
        {
          documentId: 'reading-pdf',
          pageNumber: 13,
          method: 'ANSWER_KEY_A' as const,
        },
      ],
    }));

    const answerCoverage = mapAnswersToQuestions({
      questions,
      answerEntries,
    });

    expect(answerCoverage.blockingReasons).toEqual([]);
    expect(Object.keys(answerCoverage.definitions)).toHaveLength(40);

    const semanticReviewItems = buildSemanticReviewQueue({
      structuredDraft,
      answers: answerCoverage,
    });

    expect(
      semanticReviewItems.filter(
        (item) =>
          item.critical &&
          item.state !== 'VERIFIED' &&
          item.state !== 'CONFIRMED',
      ),
    ).toEqual([]);

    const visualAnchors: VisualAnchorDraft[] = questions
      .filter((question) => question.visualRegionId)
      .map((question) => ({
        questionNumber: question.number,
        visualRegionId: question.visualRegionId!,
        anchor: { x: 0.15, y: 0.2, width: 0.2, height: 0.08 },
        verificationState: 'CONFIRMED' as const,
      }));

    const visualAssets: Record<string, MediaAsset> = {
      'diagram-page-3': {
        id: 'diagram-page-3',
        url: '/fixtures/diagram-page-3.png',
        alt: 'Synthetic diagram fixture',
        kind: 'IMAGE',
      },
      'table-page-11': {
        id: 'table-page-11',
        url: '/fixtures/table-page-11.png',
        alt: 'Synthetic table fixture',
        kind: 'IMAGE',
      },
    };

    const publication = prepareReadingPublication({
      testId: 'reading-test-1',
      versionId: 'reading-version-1',
      structuredDraft,
      answerCoverage,
      reviewItems: semanticReviewItems,
      visualAnchors,
      visualAssets,
    });

    expect(publication.ok).toBe(true);
    if (!publication.ok) return;

    const studentQuestions = allStudentQuestions(
      publication.value.studentPackage.modules[0].sections.flatMap((section) =>
        section.questionGroups.map((group) => group.questions),
      ),
    );

    expect(publication.value.studentPackage.modules).toHaveLength(1);
    expect(publication.value.studentPackage.modules[0].kind).toBe('READING');
    expect(publication.value.studentPackage.modules[0].sections).toHaveLength(3);
    expect(studentQuestions).toHaveLength(40);
    expect(Object.keys(publication.value.protectedAnswers)).toHaveLength(40);

    expect(studentQuestions.find((question) => question.number === 1)?.type)
      .toBe('DIAGRAM_LABEL_COMPLETION');
    expect(studentQuestions.find((question) => question.number === 10)?.type)
      .toBe('TRUE_FALSE_NOT_GIVEN');
    expect(studentQuestions.find((question) => question.number === 20)?.type)
      .toBe('MATCHING_HEADINGS');
    expect(studentQuestions.find((question) => question.number === 28)?.type)
      .toBe('TABLE_COMPLETION');
    expect(studentQuestions.find((question) => question.number === 37)?.type)
      .toBe('MATCHING_FEATURES');

    const studentJson = JSON.stringify(publication.value.studentPackage);
    expect(studentJson).not.toMatch(
      /protectedAnswers|correctAnswer|answerDefinitions|canonical|alternatives/,
    );

    const responses = Object.fromEntries(
      Object.entries(publication.value.protectedAnswers).map(
        ([questionId, definition]) => [
          questionId,
          definition.canonical.length === 1
            ? definition.canonical[0]
            : definition.canonical,
        ],
      ),
    );

    for (const questionNumber of [35, 36, 37, 38, 39, 40]) {
      responses[`q-${questionNumber}`] = 'definitely wrong';
    }

    const score = scoreObjectiveAttempt({
      responses,
      definitions: publication.value.protectedAnswers,
    });

    expect(score).toMatchObject({
      rawScore: 34,
      totalQuestions: 40,
    });
  });
});
