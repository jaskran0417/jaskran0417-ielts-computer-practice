import type { AnswerDefinition } from '../../../scoring/answer-definition';
import type {
  ChoiceOption,
  StudentQuestion,
  StudentTestPackage,
} from '../../../test-schema/types';
import { containsProtectedAnswerData } from '../../../test-schema/import-mapper';
import type { AnswerDefinitionMapping } from '../answer-key/map-answer-definitions';
import type {
  StructuredQuestionDraft,
  StructuredQuestionGroupDraft,
  StructuredReadingDraft,
} from './reading-structure';

export interface BuiltReadingPublication {
  studentPackage: StudentTestPackage;
  protectedAnswers: Readonly<Record<string, AnswerDefinition>>;
}

export type BuildReadingPublicationResult =
  | { ok: true; value: BuiltReadingPublication }
  | { ok: false; reasons: string[] };

function groupInstruction(group: StructuredQuestionGroupDraft): string {
  const withoutHeader = group.sourceText
    .replace(/^\s*Questions?\s+\d+\s*[-–—]\s*\d+\s*/i, '')
    .trim();

  const firstNumberedQuestion = withoutHeader.search(
    new RegExp(`(?:^|\\s)${group.range[0]}[.)]\\s+`),
  );
  if (firstNumberedQuestion > 0) {
    return withoutHeader.slice(0, firstNumberedQuestion).trim();
  }
  return withoutHeader || `Questions ${group.range[0]}-${group.range[1]}`;
}

function options(question: StructuredQuestionDraft): ChoiceOption[] {
  return (question.options ?? []).map((option) => ({
    id: option.id,
    label: option.label,
  }));
}

function toStudentQuestion(question: StructuredQuestionDraft): StudentQuestion | null {
  const base = {
    id: question.id,
    number: question.number,
    prompt: question.prompt,
    ...(question.constraints ? { constraints: question.constraints } : {}),
  };

  switch (question.questionType) {
    case 'SINGLE_CHOICE':
      return { ...base, type: 'SINGLE_CHOICE', options: options(question) };
    case 'MULTI_SELECT':
      return { ...base, type: 'MULTI_SELECT', options: options(question) };
    case 'TRUE_FALSE_NOT_GIVEN':
      return { ...base, type: 'TRUE_FALSE_NOT_GIVEN' };
    case 'YES_NO_NOT_GIVEN':
      return { ...base, type: 'YES_NO_NOT_GIVEN' };
    case 'MATCHING_INFORMATION':
    case 'MATCHING_HEADINGS':
    case 'MATCHING_FEATURES':
    case 'MATCHING_SENTENCE_ENDINGS':
      return { ...base, type: question.questionType, options: options(question) };
    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'TABLE_COMPLETION':
    case 'FLOW_CHART_COMPLETION':
      return {
        ...base,
        type: question.questionType,
        placeholder: 'Type your answer',
      };
    case 'DIAGRAM_LABEL_COMPLETION':
      if (!question.assetId) return null;
      return {
        ...base,
        type: 'DIAGRAM_LABEL_COMPLETION',
        assetId: question.assetId,
        ...(question.anchor ? { anchor: question.anchor } : {}),
        placeholder: 'Type your answer',
      };
  }
}

export function buildReadingPublication(input: {
  testId: string;
  versionId: string;
  draft: StructuredReadingDraft;
  answers: AnswerDefinitionMapping;
}): BuildReadingPublicationResult {
  const reasons: string[] = [];
  const unresolvedCritical = input.draft.reviewItems.filter((item) => item.critical);
  if (unresolvedCritical.length > 0) {
    reasons.push(
      `Unresolved critical structure review items: ${unresolvedCritical
        .map((item) => item.id)
        .join(', ')}`,
    );
  }

  if (!input.answers.publicationReady) {
    reasons.push('Protected answer coverage is incomplete or requires review');
  }

  const sections = input.draft.sections.map((section) => ({
    id: section.id,
    title: section.title,
    passage: {
      id: `${section.id}-passage`,
      title: section.title,
      paragraphs: section.passageText,
    },
    questionGroups: section.questionGroups.map((group) => {
      const studentQuestions: StudentQuestion[] = [];
      for (const question of group.questions) {
        const converted = toStudentQuestion(question);
        if (!converted) {
          reasons.push(`Question ${question.number} requires a confirmed visual asset`);
          continue;
        }
        studentQuestions.push(converted);
      }
      return {
        id: group.id,
        instruction: groupInstruction(group),
        questions: studentQuestions,
      };
    }),
  }));

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const studentPackage: StudentTestPackage = {
    id: input.testId,
    versionId: input.versionId,
    title: input.draft.title,
    durationSeconds: 60 * 60,
    modules: [{
      id: `${input.testId}-reading`,
      kind: 'READING',
      title: 'Reading',
      sections,
    }],
  };

  if (containsProtectedAnswerData(studentPackage)) {
    return {
      ok: false,
      reasons: ['Student package contains protected answer data'],
    };
  }

  return {
    ok: true,
    value: {
      studentPackage,
      protectedAnswers: input.answers.definitions,
    },
  };
}
