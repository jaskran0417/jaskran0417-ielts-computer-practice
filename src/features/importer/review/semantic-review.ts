import type { VerificationState, SourceEvidence } from '../domain';
import type { AnswerCoverageResult } from '../answers/question-answer-mapper';
import type { StructuredReadingDraft } from '../reading/types';

export type SemanticReviewKind =
  | 'DOCUMENT_STRUCTURE'
  | 'PASSAGE_TITLE'
  | 'INSTRUCTION'
  | 'QUESTION_TEXT'
  | 'QUESTION_TYPE'
  | 'OPTION_LIST'
  | 'VISUAL_ANCHOR'
  | 'ANSWER_DEFINITION';

export interface SemanticReviewItem {
  id: string;
  kind: SemanticReviewKind;
  label: string;
  critical: boolean;
  value: string | null;
  evidence: SourceEvidence[];
  state: VerificationState;
  questionNumber?: number;
  message?: string;
}

function answerDisplay(
  definition: AnswerCoverageResult['definitions'][string],
): string {
  return [
    ...definition.canonical,
    ...definition.alternatives.flat(),
  ].join(' | ');
}

export function buildSemanticReviewQueue(input: {
  structuredDraft: StructuredReadingDraft;
  answers: AnswerCoverageResult;
}): SemanticReviewItem[] {
  const items: SemanticReviewItem[] = [];

  for (const section of input.structuredDraft.sections) {
    items.push({
      id: `passage-${section.passageNumber}-title`,
      kind: 'PASSAGE_TITLE',
      label: `Passage ${section.passageNumber} title`,
      critical: true,
      value: section.title,
      evidence: section.evidence,
      state: section.title?.trim() ? 'VERIFIED' : 'REVIEW_REQUIRED',
    });

    for (const group of section.questionGroups) {
      items.push({
        id: `group-${group.startQuestion}-${group.endQuestion}-instruction`,
        kind: 'INSTRUCTION',
        label: `Questions ${group.startQuestion}–${group.endQuestion} instruction`,
        critical: true,
        value: group.instructionText,
        evidence: group.evidence,
        state: group.instructionText.trim() ? 'VERIFIED' : 'REVIEW_REQUIRED',
      });

      items.push({
        id: `group-${group.startQuestion}-${group.endQuestion}-type`,
        kind: 'QUESTION_TYPE',
        label:
          group.startQuestion === group.endQuestion
            ? `Question ${group.startQuestion} type`
            : `Questions ${group.startQuestion}–${group.endQuestion} type`,
        critical: true,
        value: group.type,
        evidence: group.evidence,
        state: 'VERIFIED',
      });

      for (const question of group.questions) {
        items.push({
          id: `question-${question.number}-text`,
          kind: 'QUESTION_TEXT',
          label: `Question ${question.number} text`,
          critical: true,
          value: question.prompt,
          evidence: question.evidence,
          state: question.prompt.trim() ? 'VERIFIED' : 'REVIEW_REQUIRED',
          questionNumber: question.number,
        });
      }
    }
  }

  for (const [questionId, definition] of Object.entries(input.answers.definitions)) {
    items.push({
      id: `answer-${questionId}`,
      kind: 'ANSWER_DEFINITION',
      label: `Question ${definition.questionNumber} accepted answer`,
      critical: true,
      value: answerDisplay(definition),
      evidence: definition.sourceEvidence,
      state: definition.verificationState,
      questionNumber: definition.questionNumber,
    });
  }

  for (const review of input.structuredDraft.reviewItems) {
    const kind: SemanticReviewKind =
      review.kind === 'DOCUMENT_STRUCTURE'
        ? 'DOCUMENT_STRUCTURE'
        : review.kind === 'QUESTION_TYPE'
          ? 'QUESTION_TYPE'
          : review.kind === 'OPTION_LIST'
            ? 'OPTION_LIST'
            : review.kind === 'VISUAL_ANCHOR'
              ? 'VISUAL_ANCHOR'
              : 'QUESTION_TEXT';

    items.push({
      id: `review-${review.id}`,
      kind,
      label:
        kind === 'DOCUMENT_STRUCTURE'
          ? 'Document structure'
          : review.questionNumber
            ? `Question ${review.questionNumber} ${kind === 'VISUAL_ANCHOR' ? 'visual anchor' : kind === 'QUESTION_TYPE' ? 'type' : 'text'}`
            : 'Imported structure',
      critical: true,
      value: null,
      evidence: review.evidence,
      state: 'REVIEW_REQUIRED',
      questionNumber: review.questionNumber,
      message: review.message,
    });
  }

  for (const reason of input.answers.blockingReasons) {
    items.push({
      id: `answer-coverage-${items.length + 1}`,
      kind: 'ANSWER_DEFINITION',
      label: 'Answer-key coverage',
      critical: true,
      value: null,
      evidence: [],
      state: 'REVIEW_REQUIRED',
      message: reason,
    });
  }

  return items;
}
