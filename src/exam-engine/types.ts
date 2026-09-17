export type AnswerValue = string | string[];
export type AttemptStatus = 'ACTIVE' | 'SUBMITTED';

export interface ExamAttemptState {
  id: string;
  testId: string;
  testVersionId: string;
  durationSeconds: number;
  startedAtMs: number;
  status: AttemptStatus;
  currentQuestionId: string;
  answers: Record<string, AnswerValue>;
  reviewQuestionIds: string[];
  visitedQuestionIds: string[];
  submittedAtMs?: number;
}

export type ExamAction =
  | { type: 'ANSWER_CHANGED'; questionId: string; value: AnswerValue }
  | { type: 'TOGGLE_REVIEW'; questionId: string }
  | { type: 'NAVIGATE'; questionId: string }
  | { type: 'RESTORE_ATTEMPT'; state: ExamAttemptState }
  | { type: 'SUBMIT'; submittedAtMs: number };
