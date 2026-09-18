import type { StudentTestPackage } from '../test-schema/types';
import type { ExamAttemptState } from './types';

export function questionIds(test: StudentTestPackage): string[] {
  return test.modules.flatMap((module) =>
    module.sections.flatMap((section) =>
      section.questionGroups.flatMap((group) => group.questions.map((question) => question.id)),
    ),
  );
}

export function createAttempt(test: StudentTestPackage, nowMs: number): ExamAttemptState {
  const ids = questionIds(test);
  const firstQuestionId = ids[0];
  if (!firstQuestionId) {
    throw new Error('Cannot start a test with no questions');
  }

  return {
    id: `${test.versionId}-${nowMs}`,
    testId: test.id,
    testVersionId: test.versionId,
    durationSeconds: test.durationSeconds,
    startedAtMs: nowMs,
    status: 'ACTIVE',
    currentQuestionId: firstQuestionId,
    answers: {},
    reviewQuestionIds: [],
    visitedQuestionIds: [firstQuestionId],
    highlights: [],
    notes: [],
  };
}
