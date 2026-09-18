import { mapAnswersToQuestions } from '../answers/question-answer-mapper';
import type { ImportBundle } from '../bundle/domain';
import type { ImportDraft, ImportFieldRecord } from '../local/import-repository';
import { buildSemanticReviewQueue } from '../review/semantic-review';
import { answerEntriesFromAssignedFields } from './reading-import-answer-selection';
import {
  fieldsForAssignments,
  fieldsToReadingBlocks,
} from './reading-import-source-selection';
import { buildStructuredReadingDraft } from './reading-structure-parser';
import { linkVisualQuestions } from './visual-region-linker';
import type { ImportedVisualRegion } from './types';

function resolved(field: ImportFieldRecord): boolean {
  if (!field.critical) return true;
  if (field.verification.state === 'VERIFIED') {
    return Boolean(field.verification.normalizedValue?.trim());
  }
  return (
    field.verification.state === 'CONFIRMED' &&
    Boolean(field.confirmedValue?.trim())
  );
}

export function buildReadingImportModel(input: {
  bundle: ImportBundle;
  draft: ImportDraft;
  visualRegions: ImportedVisualRegion[];
}) {
  if (input.bundle.module !== 'READING') {
    throw new Error('Reading converter requires a Reading import bundle');
  }

  const questionAssignments = input.bundle.assignments.filter(
    (assignment) => assignment.role === 'QUESTION_MATERIAL',
  );
  const answerAssignments = input.bundle.assignments.filter(
    (assignment) => assignment.role === 'ANSWER_KEY',
  );
  const questionFields = fieldsForAssignments(input.draft, questionAssignments);
  const answerFields = fieldsForAssignments(input.draft, answerAssignments);

  const structuredDraft = buildStructuredReadingDraft({
    blocks: fieldsToReadingBlocks(questionFields),
    visualRegions: input.visualRegions,
  });
  structuredDraft.title = input.bundle.title;

  const questions = structuredDraft.sections.flatMap((section) =>
    section.questionGroups.flatMap((group) => group.questions),
  );
  const visualLinking = linkVisualQuestions({
    questions,
    regions: input.visualRegions,
  });
  const visualAnchors = visualLinking.anchors.map((anchor) => {
    const confirmed = input.bundle.visualAnchorConfirmations?.[`q-${anchor.questionNumber}`];
    return confirmed
      ? {
          ...anchor,
          anchor: confirmed,
          verificationState: 'CONFIRMED' as const,
        }
      : anchor;
  });
  structuredDraft.reviewItems.push(
    ...visualLinking.reviewItems.filter(
      (item) =>
        !item.questionNumber ||
        !input.bundle.visualAnchorConfirmations?.[`q-${item.questionNumber}`],
    ),
  );

  const answerCoverage = mapAnswersToQuestions({
    questions,
    answerEntries: answerEntriesFromAssignedFields(answerFields, questions),
  });

  for (const [reviewId, confirmedValue] of Object.entries(
    input.bundle.semanticConfirmations ?? {},
  )) {
    if (!reviewId.startsWith('answer-')) continue;
    const questionId = reviewId.slice('answer-'.length);
    const definition = answerCoverage.definitions[questionId];
    const values = confirmedValue
      .split('|')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!definition || values.length === 0) continue;

    definition.canonical = [values[0]!];
    definition.alternatives = values.slice(1).map((value) => [value]);
    definition.verificationState = 'CONFIRMED';
  }

  const semanticReviewItems = buildSemanticReviewQueue({
    structuredDraft,
    answers: answerCoverage,
  });
  const sourceBlockingFieldIds = [...questionFields, ...answerFields]
    .filter((field) => !resolved(field))
    .map((field) => field.id);
  const semanticBlocked = semanticReviewItems.some(
    (item) =>
      item.critical &&
      item.state !== 'VERIFIED' &&
      item.state !== 'CONFIRMED',
  );

  return {
    structuredDraft,
    answerCoverage,
    semanticReviewItems,
    visualAnchors,
    sourceBlockingFieldIds,
    canPublish:
      questions.length > 0 &&
      sourceBlockingFieldIds.length === 0 &&
      answerCoverage.blockingReasons.length === 0 &&
      !semanticBlocked,
  };
}
