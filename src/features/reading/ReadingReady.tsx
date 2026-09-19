import type { StudentTestPackage } from '../../test-schema/types';
import type { SessionMode } from '../../session/types';

export function ReadingReady({ test, mode, onStart, onBack }: {
  test: StudentTestPackage; mode: SessionMode; onStart(): void; onBack(): void;
}) {
  const sections = test.modules[0].sections;
  const questions = sections.flatMap(section => section.questionGroups.flatMap(group => group.questions));
  return <main className="reading-ready">
    <div className="ready-card">
      <p className="page-eyebrow">Reading · {mode === 'MOCK' ? 'Mock test' : 'Practice'}</p>
      <h1>Before you begin</h1>
      <p className="ready-test-title">{test.title}</p>
      <div className="ready-facts"><span><strong>{Math.round(test.durationSeconds / 60)}</strong> minutes</span>
        <span><strong>{sections.length}</strong> parts</span><span><strong>{questions.length}</strong> questions</span></div>
      <ul>
        <li>Read each set of instructions carefully. Word limits and the number of answers vary.</li>
        <li>You can move between questions and parts at any time. Use Review to mark questions to revisit.</li>
        <li>Your answers save on this device. Check the save indicator during your test.</li>
        <li>The timer starts when you begin. It keeps running if you refresh or leave the page, and answers lock when time runs out.</li>
        <li>If this test has an unfinished attempt, starting restores its answers and original timer.</li>
      </ul>
      <p className="ready-device-note">On a computer, the passage and questions appear side by side. On a phone, switch between Passage and Questions.</p>
      <div className="ready-actions"><button type="button" className="secondary-action" onClick={onBack}>Back to setup</button>
        <button type="button" className="primary-action" onClick={onStart}>Start Reading</button></div>
    </div>
  </main>;
}
