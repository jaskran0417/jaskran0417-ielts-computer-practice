import type { ExamAction, ExamAttemptState } from './types';

export function examReducer(state: ExamAttemptState, action: ExamAction): ExamAttemptState {
  if (action.type === 'RESTORE_ATTEMPT') {
    return action.state;
  }

  if (state.status === 'SUBMITTED') {
    return state;
  }

  switch (action.type) {
    case 'ANSWER_CHANGED':
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.value },
      };
    case 'TOGGLE_REVIEW': {
      const exists = state.reviewQuestionIds.includes(action.questionId);
      return {
        ...state,
        reviewQuestionIds: exists
          ? state.reviewQuestionIds.filter((id) => id !== action.questionId)
          : [...state.reviewQuestionIds, action.questionId],
      };
    }
    case 'NAVIGATE':
      return {
        ...state,
        currentQuestionId: action.questionId,
        visitedQuestionIds: state.visitedQuestionIds.includes(action.questionId)
          ? state.visitedQuestionIds
          : [...state.visitedQuestionIds, action.questionId],
      };
    case 'SUBMIT':
      return { ...state, status: 'SUBMITTED', submittedAtMs: action.submittedAtMs };
    default:
      return state;
  }
}
