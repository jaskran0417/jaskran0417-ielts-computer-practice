import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void repository
      .loadActiveAttempt(test.versionId)
      .then((restored) => {
        if (cancelled) return;
        if (restored) {
          dispatch({ type: 'RESTORE_ATTEMPT', state: restored });
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) {
          // A storage read failure must not make the exam unusable.
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository, test.versionId]);

  useEffect(() => {
    if (!hydrated) return;

    void repository.saveAttempt(state).catch(() => {
      // Local persistence failure must not crash an active test UI.
      // A visible sync/storage status surface is added in a later milestone.
    });
  }, [hydrated, repository, state]);

  if (!hydrated) {
    return (
      <div className="exam-loading" role="status" aria-live="polite">
        Restoring saved attempt…
      </div>
    );
  }

  return <ExamContext.Provider value={{ state, dispatch }}>{children}</ExamContext.Provider>;
}

export function useExam(): ExamContextValue {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used inside ExamProvider');
  }
  return context;
}
