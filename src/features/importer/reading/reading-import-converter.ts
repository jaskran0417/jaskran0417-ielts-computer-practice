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
  structuredDraft.reviewItems.push(...visualLinking.reviewItems);

  const answerCoverage = mapAnswersToQuestions({
    questions,
    answerEntries: answerEntriesFromAssignedFields(answerFields, questions),
  });
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
    visualAnchors: visualLinking.anchors,
    sourceBlockingFieldIds,
    canPublish:
      questions.length > 0 &&
      sourceBlockingFieldIds.length === 0 &&
      answerCoverage.blockingReasons.length === 0 &&
      !semanticBlocked,
  };
}
