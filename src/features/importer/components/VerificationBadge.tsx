import type { VerificationState } from '../domain';

export function VerificationBadge({ state }: { state: VerificationState }) {
  return (
    <span className={`verification-badge verification-${state.toLowerCase().replace('_', '-')}`}>
      {state}
    </span>
  );
}
