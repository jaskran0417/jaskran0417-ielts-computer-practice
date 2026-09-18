import { useEffect, useMemo, useState } from 'react';
import type { AttemptRepository } from '../storage/attempt-repository';
import { ExamProvider } from '../features/exam/ExamProvider';
import type { ImportFileProcessor } from '../features/importer/ImportWorkspace';
import { ImportWorkspaceContainer } from '../features/importer/ImportWorkspaceContainer';
import { createLocalImportProcessor } from '../features/importer/local-file-processor';
import { ReadingExam } from '../features/reading/ReadingExam';
import { SessionBuilder } from '../features/sessions/SessionBuilder';
import { IndexedDbSessionRepository } from '../session/indexeddb-session-repository';
import { isSupabaseConfigured, supabase } from '../database/supabase';
import type { SessionRepository } from '../session/session-repository';
import type { SessionConfig, SessionModule } from '../session/types';
import { IndexedDbTestCatalog } from '../test-catalog/indexeddb-test-catalog';
import { SupabaseTestCatalog, type SupabaseCatalogClient } from '../test-catalog/supabase-test-catalog';
import type { TestCatalogRepository, TestSummary } from '../test-catalog/test-catalog-repository';
import type { StudentTestPackage } from '../test-schema/types';
import { AppShell, type AppShellNavItem } from './AppShell';

interface AppProps {
  repository?: AttemptRepository;
  sessionRepository?: SessionRepository;
  importProcessor?: ImportFileProcessor;
  testCatalog?: TestCatalogRepository;
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
  nowMs,
}: AppProps) {
  const defaultSessionRepository = useMemo(() => new IndexedDbSessionRepository(), []);
  const defaultImportProcessor = useMemo(() => createLocalImportProcessor(), []);
  const defaultTestCatalog = useMemo<TestCatalogRepository>(() => {
    if (isSupabaseConfigured && supabase) {
      return new SupabaseTestCatalog(supabase as unknown as SupabaseCatalogClient);
    }
    return new IndexedDbTestCatalog();
  }, []);
  const sessions = sessionRepository ?? defaultSessionRepository;
  const catalog = testCatalog ?? defaultTestCatalog;
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [activeTest, setActiveTest] = useState<StudentTestPackage | null>(null);
  const [publishedTests, setPublishedTests] = useState<TestSummary[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('sessions');

  useEffect(() => {
    let cancelled = false;
    void catalog
      .listPublishedTests()
      .then((tests) => {
        if (!cancelled) {
          setPublishedTests(tests);
          setCatalogError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCatalogError(
            cause instanceof Error ? cause.message : 'Unable to load published tests',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalog]);

  async function createSession(config: SessionConfig) {
    try {
      const test = await catalog.loadPublishedTest(
        config.testId,
        config.testVersionId,
      );
      setActiveTest(test);
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
          <ImportWorkspaceContainer processFile={importProcessor ?? defaultImportProcessor} />
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

  return (
    <ExamProvider test={activeTest} repository={repository} nowMs={nowMs}>
      <ReadingExam test={activeTest} />
    </ExamProvider>
  );
}
