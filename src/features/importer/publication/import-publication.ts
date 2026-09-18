import type { AnswerCoverageResult } from '../answers/question-answer-mapper';
import type { AnswerDefinitionDraft } from '../answers/types';
import type { SemanticReviewItem } from '../review/semantic-review';
import type {
  ReadingQuestionDraft,
  StructuredReadingDraft,
  VisualAnchorDraft,
} from '../reading/types';
import type {
  MediaAsset,
  StudentQuestion,
  StudentTestPackage,
} from '../../../test-schema/types';

export interface PreparedReadingPublication {
  studentPackage: StudentTestPackage;
  protectedAnswers: Record<string, AnswerDefinitionDraft>;
}

export type ReadingPublicationResult =
  | {
      ok: true;
      value: PreparedReadingPublication;
    }
  | {
      ok: false;
      reasons: string[];
      blockingIds: string[];
    };

function unresolvedSemanticItems(items: SemanticReviewItem[]): SemanticReviewItem[] {
  return items.filter(
    (item) =>
      item.critical &&
      item.state !== 'VERIFIED' &&
      item.state !== 'CONFIRMED',
  );
}

function visualAnchorForQuestion(
  question: ReadingQuestionDraft,
  anchors: VisualAnchorDraft[],
): VisualAnchorDraft | undefined {
  return anchors.find(
    (anchor) =>
      anchor.questionNumber === question.number &&
      anchor.visualRegionId === question.visualRegionId,
  );
}

function mapQuestion(input: {
  question: ReadingQuestionDraft;
  visualAnchors: VisualAnchorDraft[];
  visualAssets: Record<string, MediaAsset>;
}): { question?: StudentQuestion; reason?: string; blockingId?: string } {
  const { question } = input;
  const base = {
    id: question.id,
    number: question.number,
    prompt: question.prompt,
    instructionConstraints: {
      maxWords: question.instructionConstraints.maxWords,
      numbersAllowed: question.instructionConstraints.numbersAllowed,
    },
  };

  switch (question.type) {
    case 'SINGLE_CHOICE':
      if (!question.options?.length) {
        return {
          reason: `Question ${question.number} options are unresolved`,
          blockingId: question.id,
        };
      }
      return {
        question: {
          ...base,
          type: 'SINGLE_CHOICE',
          options: question.options,
        },
      };

    case 'MULTI_SELECT':
      return {
        reason: `Question ${question.number} multi-select limits are unresolved`,
        blockingId: question.id,
      };

    case 'TRUE_FALSE_NOT_GIVEN':
      return { question: { ...base, type: 'TRUE_FALSE_NOT_GIVEN' } };

    case 'YES_NO_NOT_GIVEN':
      return { question: { ...base, type: 'YES_NO_NOT_GIVEN' } };

    case 'MATCHING_INFORMATION':
    case 'MATCHING_HEADINGS':
    case 'MATCHING_FEATURES':
    case 'MATCHING_SENTENCE_ENDINGS':
      if (!question.options?.length) {
        return {
          reason: `Question ${question.number} options are unresolved`,
          blockingId: question.id,
        };
      }
      return {
        question: {
          ...base,
          type: question.type,
          options: question.options,
          allowOptionReuse: question.allowOptionReuse ?? false,
        },
      };

    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'FLOW_CHART_COMPLETION':
      return {
        question: {
          ...base,
          type: question.type,
        },
      };

    case 'DIAGRAM_LABEL_COMPLETION': {
      if (!question.visualRegionId) {
        return {
          reason: 'Visual questions are not ready for publication',
          blockingId: question.id,
        };
      }

      const anchor = visualAnchorForQuestion(question, input.visualAnchors);
      const asset = input.visualAssets[question.visualRegionId];
      if (
        !anchor?.anchor ||
        (anchor.verificationState !== 'VERIFIED' &&
          anchor.verificationState !== 'CONFIRMED') ||
        !asset
      ) {
        return {
          reason: 'Visual questions are not ready for publication',
          blockingId: question.id,
        };
      }

      return {
        question: {
          ...base,
          type: 'DIAGRAM_LABEL_COMPLETION',
          assetId: asset.id,
          anchor: anchor.anchor,
        },
      };
    }

    case 'TABLE_COMPLETION': {
      if (!question.visualRegionId) {
        return {
          reason: 'Visual questions are not ready for publication',
          blockingId: question.id,
        };
      }

      const anchor = visualAnchorForQuestion(question, input.visualAnchors);
      const asset = input.visualAssets[question.visualRegionId];
      if (
        !anchor?.anchor ||
        (anchor.verificationState !== 'VERIFIED' &&
          anchor.verificationState !== 'CONFIRMED') ||
        !asset
      ) {
        return {
          reason: 'Visual questions are not ready for publication',
          blockingId: question.id,
        };
      }

      return {
        question: {
          ...base,
          type: 'TABLE_COMPLETION',
          tableId: question.visualRegionId,
          cellId: question.id,
          assetId: asset.id,
          anchor: anchor.anchor,
        },
      };
    }
  }
}

export function prepareReadingPublication(input: {
  testId: string;
  versionId: string;
  structuredDraft: StructuredReadingDraft;
  answerCoverage: AnswerCoverageResult;
  reviewItems: SemanticReviewItem[];
  visualAnchors: VisualAnchorDraft[];
  visualAssets: Record<string, MediaAsset>;
}): ReadingPublicationResult {
  const unresolved = unresolvedSemanticItems(input.reviewItems);
  if (unresolved.length > 0) {
    return {
      ok: false,
      reasons: ['Critical semantic review items are unresolved'],
      blockingIds: unresolved.map((item) => item.id),
    };
  }

  if (input.answerCoverage.blockingReasons.length > 0) {
    return {
      ok: false,
      reasons: [...input.answerCoverage.blockingReasons],
      blockingIds: [],
    };
  }

  const mappingReasons: string[] = [];
  const mappingBlockingIds: string[] = [];

  const sections = input.structuredDraft.sections.map((section) => ({
    id: section.id,
    title: section.title ?? `Passage ${section.passageNumber}`,
    passage: {
      id: `passage-${section.passageNumber}`,
      title: section.title ?? `Passage ${section.passageNumber}`,
      paragraphs: section.passageText,
    },
    questionGroups: section.questionGroups.map((group) => {
      const questions: StudentQuestion[] = [];

      for (const draftQuestion of group.questions) {
        const mapped = mapQuestion({
          question: draftQuestion,
          visualAnchors: input.visualAnchors,
          visualAssets: input.visualAssets,
        });

        if (mapped.question) {
          questions.push(mapped.question);
        } else if (mapped.reason) {
          mappingReasons.push(mapped.reason);
          if (mapped.blockingId) mappingBlockingIds.push(mapped.blockingId);
        }
      }

      return {
        id: group.id,
        instruction: group.instructionText,
        questions,
      };
    }),
  }));

  if (mappingReasons.length > 0) {
    return {
      ok: false,
      reasons: [...new Set(mappingReasons)],
      blockingIds: [...new Set(mappingBlockingIds)],
    };
  }

  const assets = Object.values(input.visualAssets);

  const studentPackage: StudentTestPackage = {
    id: input.testId,
    versionId: input.versionId,
    title: input.structuredDraft.title,
    durationSeconds: 60 * 60,
    modules: [
      {
        id: `reading-${input.versionId}`,
        kind: 'READING',
        title: 'Reading',
        sections,
      },
    ],
    ...(assets.length > 0 ? { assets } : {}),
  };

  return {
    ok: true,
    value: {
      studentPackage,
      protectedAnswers: { ...input.answerCoverage.definitions },
    },
  };
}
