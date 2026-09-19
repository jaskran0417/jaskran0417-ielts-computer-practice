import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttemptRepository } from '../storage/attempt-repository';
import { ExamProvider } from '../features/exam/ExamProvider';
import type { ImportFileProcessor } from '../features/importer/ImportWorkspace';
import { ImportWorkspaceContainer } from '../features/importer/ImportWorkspaceContainer';
import { createLocalImportProcessor } from '../features/importer/local-file-processor';
import { ReadingExam } from '../features/reading/ReadingExam';
import { ReadingReady } from '../features/reading/ReadingReady';
import { SessionResult } from '../features/results/SessionResult';
import { SessionBuilder } from '../features/sessions/SessionBuilder';
import { IndexedDbSessionRepository } from '../session/indexeddb-session-repository';
import type { ExamAttemptState } from '../exam-engine/types';
import {
  IndexedDbProtectedAnswerRepository,
  type ProtectedAnswerRepository,
} from '../scoring/indexeddb-protected-answer-repository';
import { scoreObjectiveAttempt } from '../scoring/score-objective-attempt';
import type { SessionRepository } from '../session/session-repository';
import type {
  SessionConfig,
  SessionModule,
  SessionResultSummary,
} from '../session/types';
import { IndexedDbTestCatalog } from '../test-catalog/indexeddb-test-catalog';
import { LocalImportedTestPublisher } from '../test-catalog/local-imported-test-publisher';
import type { TestCatalogRepository, TestSummary } from '../test-catalog/test-catalog-repository';
import type { StudentTestPackage } from '../test-schema/types';
import { AppShell, type AppShellNavItem } from './AppShell';

interface AppProps {
  repository?: AttemptRepository;
  sessionRepository?: SessionRepository;
  importProcessor?: ImportFileProcessor;
  testCatalog?: TestCatalogRepository;
  protectedAnswerRepository?: ProtectedAnswerRepository;
  nowMs?: number;
}

type WorkspaceSection = 'sessions' | 'import';

const SUPPORTED_PLAYERS = new Set<SessionModule>(['READING']);
const WORKSPACE_NAV: AppShellNavItem[] = [
  { id: 'sessions', label: 'Sessions', hint: 'Configure and run a test' },
  { id: 'import', label: 'Import', hint: 'Review source material' },
];


function labelModule(module: SessionModule): string {
  return module[0] + module.slice(1).toLowerCase();
}

export default function App({
  repository,
  sessionRepository,
  importProcessor,
  testCatalog,
  protectedAnswerRepository,
  nowMs,
}: AppProps) {
  const defaultSessionRepository = useMemo(() => new IndexedDbSessionRepository(), []);
  const defaultImportProcessor = useMemo(() => createLocalImportProcessor(), []);
  const defaultTestCatalog = useMemo<TestCatalogRepository>(
    () => new IndexedDbTestCatalog(),
    [],
  );
  const defaultProtectedAnswers = useMemo(
    () => new IndexedDbProtectedAnswerRepository(),
    [],
  );
  const sessions = sessionRepository ?? defaultSessionRepository;
  const catalog = testCatalog ?? defaultTestCatalog;
  const protectedAnswers = protectedAnswerRepository ?? defaultProtectedAnswers;
  const localPublisher = useMemo(
    () => new LocalImportedTestPublisher(catalog, protectedAnswers),
    [catalog, protectedAnswers],
  );
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [activeTest, setActiveTest] = useState<StudentTestPackage | null>(null);
  const [ready, setReady] = useState(false);
  const [publishedTests, setPublishedTests] = useState<TestSummary[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResultSummary | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('sessions');
  const examNow = useCallback(() => nowMs ?? Date.now(), [nowMs]);

  const refreshPublishedTests = useCallback(async () => {
    try {
      const tests = await catalog.listPublishedTests();
      setPublishedTests(tests);
      setCatalogError(null);
    } catch (cause) {
      setCatalogError(
        cause instanceof Error ? cause.message : 'Unable to load published tests',
      );
    }
  }, [catalog]);

  useEffect(() => {
    void refreshPublishedTests();
  }, [refreshPublishedTests]);

  async function createSession(config: SessionConfig) {
    try {
      const test = await catalog.loadPublishedTest(
        config.testId,
        config.testVersionId,
      );
      setActiveTest(test);
      setReady(false);
      setSession(config);
      setCatalogError(null);
      void sessions.saveSession(config).catch(() => {
        // The session remains usable if persistence fails. A dedicated storage
        // status surface will report local persistence failures in a later slice.
      });
    } catch (cause) {
      setCatalogError(
        cause instanceof Error ? cause.message : 'Unable to load the selected test',
      );
    }
  }

  async function scoreSubmittedReading(attempt: ExamAttemptState) {
    try {
      const readingModule = activeTest?.modules.find((module) => module.kind === 'READING');
      const scoringMode = readingModule?.scoringMode ?? 'AUTO';
      const totalQuestions =
        readingModule?.sections.reduce(
          (total, section) =>
            total +
            section.questionGroups.reduce(
              (groupTotal, group) => groupTotal + group.questions.length,
              0,
            ),
          0,
        ) ?? 0;

      if (scoringMode === 'MANUAL') {
        setSessionResult({
          selectedModules: session?.modules ?? ['READING'],
          modules: [
            {
              module: 'READING',
              assessmentState: 'PENDING_MANUAL',
              totalQuestions,
            },
          ],
          overallBand: null,
          overallStatus: 'PENDING',
        });
        setCatalogError(null);
        return;
      }

      if (scoringMode === 'UNSCORED') {
        setSessionResult({
          selectedModules: session?.modules ?? ['READING'],
          modules: [
            {
              module: 'READING',
              assessmentState: 'UNSCORED',
              totalQuestions,
            },
          ],
          overallBand: null,
          overallStatus: 'NOT_APPLICABLE',
        });
        setCatalogError(null);
        return;
      }

      const definitions = await protectedAnswers.load(attempt.testVersionId);
      if (!definitions) {
        throw new Error('Protected answers for this local test are unavailable');
      }

      const score = scoreObjectiveAttempt({
        responses: attempt.answers,
        definitions,
      });

      setSessionResult({
        selectedModules: session?.modules ?? ['READING'],
        modules: [
          {
            module: 'READING',
            assessmentState: 'SCORED',
            rawScore: score.rawScore,
            totalQuestions: score.totalQuestions,
          },
        ],
        overallBand: null,
        overallStatus: 'COMPLETE',
      });
      setCatalogError(null);
    } catch (cause) {
      setCatalogError(
        cause instanceof Error ? cause.message : 'Unable to score this Reading attempt',
      );
    }
  }

  function navigateWorkspace(sectionId: string) {
    if (sectionId === 'sessions' || sectionId === 'import') {
      setActiveSection(sectionId);
    }
  }

  if (!session) {
    return (
      <AppShell
        activeSection={activeSection}
        navItems={WORKSPACE_NAV}
        onNavigate={navigateWorkspace}
      >
        {activeSection === 'import' ? (
          <ImportWorkspaceContainer
            processFile={importProcessor ?? defaultImportProcessor}
            publisher={localPublisher}
            onPublished={async () => {
              await refreshPublishedTests();
              setActiveSection('sessions');
            }}
          />
        ) : (
          <>
            {catalogError ? (
              <div className="import-error" role="alert">
                {catalogError}
              </div>
            ) : null}
            <SessionBuilder
              tests={publishedTests}
              nowMs={nowMs}
              onCreate={(config) => void createSession(config)}
            />
          </>
        )}
      </AppShell>
    );
  }

  if (sessionResult) {
    return (
      <AppShell>
        <SessionResult summary={sessionResult} />
        <button type="button" className="primary-action" onClick={() => {
          setSessionResult(null); setSession(null); setReady(false);
        }}>Back to tests</button>
      </AppShell>
    );
  }

  const unsupportedModules = session.modules.filter((module) => !SUPPORTED_PLAYERS.has(module));

  if (unsupportedModules.length > 0) {
    return (
      <AppShell>
        <section className="setup-panel" aria-labelledby="session-configured-title">
          <p className="page-eyebrow">Sessions / Ready</p>
          <h1 id="session-configured-title">Session configured</h1>
          <p className="page-subtitle">
            The session configuration is saved without pretending unfinished module players are ready.
          </p>

          <div className="module-chip-row" aria-label="Selected modules">
            {session.modules.map((module) => (
              <span className="module-chip" key={module}>
                {labelModule(module)}
              </span>
            ))}
          </div>

          <div className="summary-note" role="status">
            {unsupportedModules.map((module) => (
              <p key={module}>{labelModule(module)} player is not attached yet.</p>
            ))}
          </div>

          <button className="primary-action" type="button" onClick={() => setSession(null)}>
            Configure another session
          </button>
        </section>
      </AppShell>
    );
  }

  if (!activeTest) {
    return (
      <AppShell>
        <section className="setup-panel" role="status">
          Loading selected test…
        </section>
      </AppShell>
    );
  }

  if (!ready) return <ReadingReady test={activeTest} mode={session.mode}
    onStart={() => setReady(true)} onBack={() => setSession(null)} />;

  return (
    <ExamProvider test={activeTest} repository={repository} nowMs={nowMs}>
      {catalogError && <div className="exam-result-error" role="alert">{catalogError}. Your answers are locked in this session.</div>}
      <ReadingExam test={activeTest} mode={session.mode} onSubmit={scoreSubmittedReading} now={examNow} />
    </ExamProvider>
  );
}
