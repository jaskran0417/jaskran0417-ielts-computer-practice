import type { ExamAttemptState } from '../exam-engine/types';

export interface AttemptRepository {
  loadAttempt(id: string): Promise<ExamAttemptState | null>;
  saveAttempt(attempt: ExamAttemptState): Promise<void>;
  deleteAttempt(id: string): Promise<void>;
}
