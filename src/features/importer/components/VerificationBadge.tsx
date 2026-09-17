import type { VerificationState } from '../domain';

interface VerificationBadgeProps {
  state: VerificationState;
}

export function VerificationBadge({ state }: VerificationBadgeProps) {
  return <span className={`verification-badge state-${state.toLowerCase()}`}>{state}</span>;
}
