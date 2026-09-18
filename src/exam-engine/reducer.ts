import type { ExamAction, ExamAttemptState } from './types';

function normalizeRestoredAttempt(state: ExamAttemptState): ExamAttemptState {
  const legacy = state as ExamAttemptState & {
    highlights?: ExamAttemptState['highlights'];
    notes?: ExamAttemptState['notes'];
  };

  return {
    ...state,
    highlights: legacy.highlights ?? [],
    notes: legacy.notes ?? [],
  };
}

export function examReducer(state: ExamAttemptState, action: ExamAction): ExamAttemptState {
  if (action.type === 'RESTORE_ATTEMPT') {
    return normalizeRestoredAttempt(action.state);
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
    case 'ADD_HIGHLIGHT':
      return {
        ...state,
        highlights: [
          ...state.highlights.filter((item) => item.id !== action.highlight.id),
          action.highlight,
        ],
      };
    case 'REMOVE_HIGHLIGHT':
      return {
        ...state,
        highlights: state.highlights.filter((item) => item.id !== action.highlightId),
      };
    case 'UPSERT_NOTE':
      return {
        ...state,
        notes: [
          ...state.notes.filter((item) => item.id !== action.note.id),
          action.note,
        ],
      };
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter((item) => item.id !== action.noteId),
      };
    case 'SUBMIT':
      return { ...state, status: 'SUBMITTED', submittedAtMs: action.submittedAtMs };
    default:
      return state;
  }
}
