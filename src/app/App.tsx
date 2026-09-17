import { useMemo, useState } from 'react';
import type { AttemptRepository } from '../storage/attempt-repository';
import { ExamProvider } from '../features/exam/ExamProvider';
import {
  ImportWorkspace,
  type ImportFileProcessor,
} from '../features/importer/ImportWorkspace';
import { ReadingExam } from '../features/reading/ReadingExam';
import { SessionBuilder } from '../features/sessions/SessionBuilder';
import { IndexedDbSessionRepository } from '../session/indexeddb-session-repository';
import type { SessionRepository } from '../session/session-repository';
import type { SessionConfig, SessionModule } from '../session/types';
import { sampleReadingTest } from '../test-schema/sample-reading';
import { AppShell, type AppShellNavItem } from './AppShell';

interface AppProps {
  repository?: AttemptRepository;
  sessionRepository?: SessionRepository;
  importProcessor?: ImportFileProcessor;
  nowMs?: number;
}

type WorkspaceSection = 'sessions' | 'import';

const SUPPORTED_PLAYERS = new Set<SessionModule>(['READING']);
const WORKSPACE_NAV: AppShellNavItem[] = [
  { id: 'sessions', label: 'Sessions', hint: 'Configure and run a test' },
  { id: 'import', label: 'Import', hint: 'Review source material' },
];

const unavailableImportProcessor: ImportFileProcessor = async () => {
  throw new Error('Automatic local extraction is not connected in this preview yet.');
};

function labelModule(module: SessionModule): string {
  return module[0] + module.slice(1).toLowerCase();
}

export default function App({
  repository,
  sessionRepository,
  importProcessor,
  nowMs,
}: AppProps) {
  const defaultSessionRepository = useMemo(() => new IndexedDbSessionRepository(), []);
  const sessions = sessionRepository ?? defaultSessionRepository;
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('sessions');

  function createSession(config: SessionConfig) {
    setSession(config);
    void sessions.saveSession(config).catch(() => {
      // The session remains usable if persistence fails. A dedicated storage
      // status surface will report local persistence failures in a later slice.
    });
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
          <ImportWorkspace processFile={importProcessor ?? unavailableImportProcessor} />
        ) : (
          <SessionBuilder
            testId={sampleReadingTest.id}
            testVersionId={sampleReadingTest.versionId}
            nowMs={nowMs}
            onCreate={createSession}
          />
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

  return (
    <ExamProvider test={sampleReadingTest} repository={repository} nowMs={nowMs}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>
  );
}
