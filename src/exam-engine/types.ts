export type AnswerValue = string | string[];
export type AttemptStatus = 'ACTIVE' | 'SUBMITTED';

export interface PassageTextRange {
  passageId: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface PassageHighlight extends PassageTextRange {
  id: string;
}

export interface PassageNote {
  id: string;
  passageId: string;
  paragraphIndex?: number;
  startOffset?: number;
  endOffset?: number;
  quote?: string;
  body: string;
  updatedAtMs: number;
}

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
  highlights: PassageHighlight[];
  notes: PassageNote[];
  submittedAtMs?: number;
}

export type ExamAction =
  | { type: 'ANSWER_CHANGED'; questionId: string; value: AnswerValue }
  | { type: 'TOGGLE_REVIEW'; questionId: string }
  | { type: 'NAVIGATE'; questionId: string }
  | { type: 'ADD_HIGHLIGHT'; highlight: PassageHighlight }
  | { type: 'REMOVE_HIGHLIGHT'; highlightId: string }
  | { type: 'UPSERT_NOTE'; note: PassageNote }
  | { type: 'DELETE_NOTE'; noteId: string }
  | { type: 'RESTORE_ATTEMPT'; state: ExamAttemptState }
  | { type: 'SUBMIT'; submittedAtMs: number };
