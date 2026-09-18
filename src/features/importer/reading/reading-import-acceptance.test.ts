import { describe, expect, it } from 'vitest';
import fixture from '../../../../tests/fixtures/reading-import/fixture.json';
import expectedAnswers from '../../../../tests/fixtures/reading-import/expected-answers.json';
import { mapAnswersToQuestions } from '../answers/question-answer-mapper';
import { parseAnswerKey } from '../answer-key/parse-answer-key';
import { prepareReadingPublication } from '../publication/import-publication';
import { buildSemanticReviewQueue } from '../review/semantic-review';
import { scoreObjectiveAttempt } from '../../../scoring/score-objective-attempt';
import { readingModuleFromTest } from '../../../test-schema/module-access';
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
  it('survives the real PDF formatting quirks across structure and answer mapping', () => {
    const blocks = sourceBlocks().map((block) => {
      if (block.pageNumber === 4 && block.text.includes('Questions 10-14')) {
        return {
          ...block,
          text: block.text
            .replace('A. Ending alpha', 'A .\u00a0Ending alpha')
            .replace('B. Ending bravo', 'B.\u200b Ending bravo')
            .replace('C. Ending charlie', 'C ) Ending charlie'),
        };
      }

      if (block.pageNumber === 7) {
        return {
          ...block,
          text: block.text
            .replace('i Heading one', 'i . Heading one')
            .replace('ii Heading two', 'ii.\u200b Heading two')
            .replace('iii Heading three', 'iii ) Heading three'),
        };
      }

      if (block.pageNumber === 11 && block.text.includes('Questions 28-31')) {
        return {
          ...block,
          text: [
            'Questions 28-31',
            'Complete the table below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.',
            '28. the unification of Catholic Spain',
            'October 12, 1492 arrival in 29. .......... Christopher Columbus',
            '1493 Columbus sends two copies of a report sent to the king, 30. .......... and Luis de Santangel',
            '1507 the naming of 31. .......... Martin Waldseemuller',
          ].join('\n'),
        };
      }

      if (block.pageNumber === 11 && block.text.includes('Questions 32-36')) {
        return {
          ...block,
          text: block.text.replace(
            'Passage 3 has six paragraphs labelled A-F.',
            'Passage 3 has six paragraphs labelled\u00a0 A \u200b-\u200b F.',
          ),
        };
      }

      return block;
    });

    const structuredDraft = buildStructuredReadingDraft({
      blocks,
      visualRegions: visualRegions(),
    });
    const questions = allDraftQuestions(structuredDraft);

    expect(questions).toHaveLength(40);
    expect(questions.find((question) => question.number === 29)?.prompt).toContain('Christopher Columbus');
    expect(questions.find((question) => question.number === 30)?.prompt).toContain('Luis de Santangel');
    expect(questions.find((question) => question.number === 5)?.options).toHaveLength(9);
    expect(questions.find((question) => question.number === 20)?.options).toHaveLength(3);
    expect(questions.find((question) => question.number === 32)?.options).toHaveLength(6);
    expect(structuredDraft.reviewItems).toEqual([]);

    const answerLines = Array.from({ length: 40 }, (_, index) => {
      const number = index + 1;
      const raw = expectedAnswers[String(number) as keyof typeof expectedAnswers];

      if (number === 10) return '10. F Extra info- para 2: almost entirely, not entirely';
      if (number === 11) return '11. T Extra info- para 5';
      if (number === 12) return '12. NG Extra info- para 6';
      if (number === 13) return '13. NG Extra info- para 7 + 4';
      if (number === 14) return '14. T Extra info- para 9';
      if (number === 17) return '17. (around) six/6 years';
      if (number === 18) return '18. ninety/90 percent/per cent/%';
      if (number === 29) return '29. (the) Bahamas';
      if (number === 30) return '30. (the) queen / Isabella';

      return `${number}. ${raw}`;
    });

    const parsedKey = parseAnswerKey(['Answers', ...answerLines].join('\n'));
    expect(parsedKey.answers).toHaveLength(40);

    const byQuestion = new Map(questions.map((question) => [question.number, question]));
    const answerCoverage = mapAnswersToQuestions({
      questions,
      answerEntries: parsedKey.answers.map((answer) => {
        const question = byQuestion.get(answer.questionNumber);
        if (!question) throw new Error(`Missing question ${answer.questionNumber}`);

        return {
          questionNumber: answer.questionNumber,
          raw: answer.answer,
          constraints: question.instructionConstraints,
          evidence: [{
            documentId: 'reading-pdf',
            pageNumber: 13,
            method: 'ANSWER_KEY_A' as const,
          }],
        };
      }),
    });

    expect(answerCoverage.blockingReasons).toEqual([]);
    expect(Object.keys(answerCoverage.definitions)).toHaveLength(40);
    expect(answerCoverage.definitions['q-10']?.canonical).toEqual(['false']);
    expect(answerCoverage.definitions['q-11']?.canonical).toEqual(['true']);
    expect(answerCoverage.definitions['q-12']?.canonical).toEqual(['not_given']);
    expect([
      ...answerCoverage.definitions['q-17']!.canonical,
      ...answerCoverage.definitions['q-17']!.alternatives.flat(),
    ]).toEqual(expect.arrayContaining(['six years', '6 years', 'around six years', 'around 6 years']));
    expect([
      ...answerCoverage.definitions['q-18']!.canonical,
      ...answerCoverage.definitions['q-18']!.alternatives.flat(),
    ]).toEqual(expect.arrayContaining(['ninety percent', '90 percent', '90%']));
    expect([
      ...answerCoverage.definitions['q-30']!.canonical,
      ...answerCoverage.definitions['q-30']!.alternatives.flat(),
    ]).toEqual(expect.arrayContaining(['queen', 'the queen', 'isabella']));
  });

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

    const publishedReading = readingModuleFromTest(publication.value.studentPackage);
    const studentQuestions = allStudentQuestions(
      publishedReading.sections.flatMap((section) =>
        section.questionGroups.map((group) => group.questions),
      ),
    );

    expect(publication.value.studentPackage.modules).toHaveLength(1);
    expect(publishedReading.kind).toBe('READING');
    expect(publishedReading.sections).toHaveLength(3);
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
