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

function parseConfirmedOptions(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^([A-Za-z]+)\s*[.)]\s*(.+)$/);
      return match?.[1] && match[2]
        ? [{ id: match[1], label: match[2].trim() }]
        : [];
    });
}

function applySemanticStructureConfirmations(
  draft: ReturnType<typeof buildStructuredReadingDraft>,
  confirmations: Record<string, string>,
): void {
  for (const [reviewId, confirmedValue] of Object.entries(confirmations)) {
    const value = confirmedValue.trim();
    if (!value) continue;

    const questionText = reviewId.match(/^review-question-text-(\d+)$/);
    if (questionText) {
      const questionNumber = Number(questionText[1]);
      const group = draft.sections
        .flatMap((section) => section.questionGroups)
        .find(
          (candidate) =>
            questionNumber >= candidate.startQuestion &&
            questionNumber <= candidate.endQuestion,
        );

      if (group && !group.questions.some((question) => question.number === questionNumber)) {
        const template = group.questions[0];
        group.questions.push({
          id: `q-${questionNumber}`,
          number: questionNumber,
          type: group.type,
          prompt: value,
          instructionConstraints: group.instructionConstraints,
          evidence: group.evidence,
          ...(template?.visualRegionId
            ? { visualRegionId: template.visualRegionId }
            : {}),
          ...(template?.options ? { options: template.options } : {}),
          ...(typeof template?.allowOptionReuse === 'boolean'
            ? { allowOptionReuse: template.allowOptionReuse }
            : {}),
        });
        group.questions.sort((left, right) => left.number - right.number);
        draft.reviewItems = draft.reviewItems.filter(
          (item) =>
            !(
              item.kind === 'QUESTION_TEXT' &&
              item.questionNumber === questionNumber
            ),
        );
      }
      continue;
    }

    const optionList = reviewId.match(/^review-option-list-(\d+)$/);
    if (optionList) {
      const questionNumber = Number(optionList[1]);
      const group = draft.sections
        .flatMap((section) => section.questionGroups)
        .find(
          (candidate) =>
            questionNumber >= candidate.startQuestion &&
            questionNumber <= candidate.endQuestion,
        );
      const options = parseConfirmedOptions(value);
      if (!group || options.length === 0) continue;

      for (const question of group.questions) {
        question.options = options;
      }
      draft.reviewItems = draft.reviewItems.filter(
        (item) =>
          !(
            item.kind === 'OPTION_LIST' &&
            typeof item.questionNumber === 'number' &&
            item.questionNumber >= group.startQuestion &&
            item.questionNumber <= group.endQuestion
          ),
      );
    }
  }
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
  const scoringMode = input.bundle.scoringMode ?? 'AUTO';
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
  applySemanticStructureConfirmations(
    structuredDraft,
    input.bundle.semanticConfirmations ?? {},
  );

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
  }).map((item) =>
    scoringMode !== 'AUTO' && item.kind === 'ANSWER_DEFINITION'
      ? { ...item, critical: false }
      : item,
  );
  for (const anchor of visualAnchors) {
    if (anchor.verificationState !== 'CONFIRMED' || !anchor.anchor) continue;
    const question = questions.find((candidate) => candidate.number === anchor.questionNumber);
    semanticReviewItems.push({
      id: `review-visual-anchor-${anchor.questionNumber}`,
      kind: 'VISUAL_ANCHOR',
      label: `Question ${anchor.questionNumber} visual anchor`,
      critical: true,
      value: 'Position confirmed',
      evidence: question?.evidence ?? [],
      state: 'CONFIRMED',
      questionNumber: anchor.questionNumber,
    });
  }
  const requiredSourceFields =
    scoringMode === 'AUTO' ? [...questionFields, ...answerFields] : questionFields;
  const sourceBlockingFieldIds = requiredSourceFields
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
      (scoringMode !== 'AUTO' || answerCoverage.blockingReasons.length === 0) &&
      !semanticBlocked,
    scoringMode,
  };
}
