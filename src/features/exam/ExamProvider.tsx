import { createContext, type Dispatch, type ReactNode, useContext, useEffect, useReducer } from 'react';
import { createAttempt } from '../../exam-engine/create-attempt';
import { examReducer } from '../../exam-engine/reducer';
import type { ExamAction, ExamAttemptState } from '../../exam-engine/types';
import type { StudentTestPackage } from '../../test-schema/types';
import type { AttemptRepository } from '../../storage/attempt-repository';
import { IndexedDbAttemptRepository } from '../../storage/indexeddb-attempt-repository';

interface ExamContextValue {
  state: ExamAttemptState;
  dispatch: Dispatch<ExamAction>;
}

const ExamContext = createContext<ExamContextValue | null>(null);
const defaultRepository = new IndexedDbAttemptRepository();

interface ExamProviderProps {
  test: StudentTestPackage;
  children: ReactNode;
  repository?: AttemptRepository;
  nowMs?: number;
}

export function ExamProvider({
  test,
  children,
  repository = defaultRepository,
  nowMs = Date.now(),
}: ExamProviderProps) {
  const [state, dispatch] = useReducer(examReducer, createAttempt(test, nowMs));

  useEffect(() => {
    void repository.saveAttempt(state).catch(() => {
      // Local persistence failure must not crash an active test UI.
      // A visible sync/storage status surface is added in a later milestone.
    });
  }, [repository, state]);

  return <ExamContext.Provider value={{ state, dispatch }}>{children}</ExamContext.Provider>;
}

export function useExam(): ExamContextValue {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used inside ExamProvider');
  }
  return context;
}
