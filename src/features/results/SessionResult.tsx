import type { AuditSummary, SessionResultSummary } from '../../session/types';

interface SessionResultProps {
  summary: SessionResultSummary;
  audit?: AuditSummary;
}

export function SessionResult(_props: SessionResultProps) {
  return (
    <section>
      <h1>Session result</h1>
    </section>
  );
}
