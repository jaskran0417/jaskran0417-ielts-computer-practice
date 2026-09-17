import type { SessionConfig } from '../../session/types';

interface SessionBuilderProps {
  testId: string;
  testVersionId: string;
  nowMs?: number;
  onCreate(config: SessionConfig): void;
}

export function SessionBuilder(_props: SessionBuilderProps) {
  return <button disabled>Create session</button>;
}
