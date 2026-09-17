import type { SessionMode } from './types';

export type ListeningCandidateAction = 'PAUSE' | 'REPLAY' | 'SEEK';

export interface ListeningPermissions {
  pause: boolean;
  replay: boolean;
  seek: boolean;
}

export function listeningPermissions(mode: SessionMode): ListeningPermissions {
  const allowed = mode === 'PRACTICE';
  return { pause: allowed, replay: allowed, seek: allowed };
}

export function assertListeningActionAllowed(
  mode: SessionMode,
  action: ListeningCandidateAction,
): void {
  const permissions = listeningPermissions(mode);
  const allowed =
    action === 'PAUSE'
      ? permissions.pause
      : action === 'REPLAY'
        ? permissions.replay
        : permissions.seek;

  if (!allowed) {
    throw new Error(`Mock Listening does not allow candidate ${action.toLowerCase()}`);
  }
}
