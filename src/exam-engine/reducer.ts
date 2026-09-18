import type { ExamAction, ExamAttemptState } from './types';

function normalizeRestoredAttempt(state: ExamAttemptState): ExamAttemptState {
  const legacy = state as ExamAttemptState & {
    highlights?: ExamAttemptState['highlights'];
    notes?: ExamAttemptState['notes'];
    listeningPlayback?: ExamAttemptState['listeningPlayback'];
  };

  return {
    ...state,
    highlights: legacy.highlights ?? [],
    notes: legacy.notes ?? [],
    ...(legacy.listeningPlayback
      ? {
          listeningPlayback: {
            ...legacy.listeningPlayback,
            pauses: legacy.listeningPlayback.pauses ?? [],
          },
        }
      : {}),
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
    case 'LISTENING_STARTED':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          partIndex: action.partIndex,
          audioPositionSeconds: action.audioPositionSeconds,
          started: true,
          ended: false,
        },
      };
    case 'LISTENING_PROGRESS':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          partIndex: action.partIndex,
          audioPositionSeconds: action.audioPositionSeconds,
        },
      };
    case 'LISTENING_PART_CHANGED':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          partIndex: action.partIndex,
          audioPositionSeconds: action.audioPositionSeconds,
          started: true,
          ended: false,
        },
      };
    case 'LISTENING_PRACTICE_PAUSE_STARTED':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          pauses: [
            ...state.listeningPlayback.pauses.filter(
              (pause) => pause.id !== action.pause.id,
            ),
            action.pause,
          ],
        },
      };
    case 'LISTENING_PRACTICE_PAUSE_ENDED':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          audioPositionSeconds: action.audioPositionSeconds,
          pauses: state.listeningPlayback.pauses.map((pause) =>
            pause.id === action.pauseId
              ? { ...pause, endedAtMs: action.endedAtMs }
              : pause,
          ),
        },
      };
    case 'LISTENING_FINAL_REVIEW_STARTED':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          finalReviewStartedAtMs: action.startedAtMs,
        },
      };
    case 'LISTENING_ENDED':
      if (!state.listeningPlayback) return state;
      return {
        ...state,
        listeningPlayback: {
          ...state.listeningPlayback,
          ended: true,
        },
      };
    case 'SUBMIT':
      return { ...state, status: 'SUBMITTED', submittedAtMs: action.submittedAtMs };
    default:
      return state;
  }
}
