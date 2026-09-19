import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
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
  saveStatus: 'SAVING' | 'SAVED' | 'ERROR';
  retrySave(): void;
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
  const [saveStatus, setSaveStatus] = useState<'SAVING' | 'SAVED' | 'ERROR'>('SAVING');
  const [saveRequest, setSaveRequest] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const latestSave = useRef(0);
  const [restoreError, setRestoreError] = useState(false);

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
          setRestoreError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository, test.versionId]);

  useEffect(() => {
    if (!hydrated) return;
    const sequence = ++latestSave.current;
    let active = true;
    setSaveStatus('SAVING');
    // Serialize writes: a delayed earlier save must never replace a newer answer.
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => repository.saveAttempt(state));
    void saveQueue.current.then(() => {
      if (active && sequence === latestSave.current) setSaveStatus('SAVED');
    }, () => {
      if (active && sequence === latestSave.current) setSaveStatus('ERROR');
    });
    return () => { active = false; };
  }, [hydrated, repository, state, saveRequest]);

  if (restoreError && !hydrated) {
    return <div className="exam-loading" role="alert">
      <div><p>Unable to restore saved answers. Reload to try again before starting the test.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload</button></div>
    </div>;
  }

  if (!hydrated) {
    return (
      <div className="exam-loading" role="status" aria-live="polite">
        Restoring saved attempt…
      </div>
    );
  }

  return <ExamContext.Provider value={{ state, dispatch, saveStatus,
    retrySave: () => setSaveRequest(value => value + 1) }}>{children}</ExamContext.Provider>;
}

export function useExam(): ExamContextValue {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used inside ExamProvider');
  }
  return context;
}
