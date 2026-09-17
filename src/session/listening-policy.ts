import type { SessionMode } from './types';

export type ListeningCandidateAction = 'PAUSE' | 'REPLAY' | 'SEEK';

export interface ListeningPermissions {
  pause: boolean;
  replay: boolean;
  seek: boolean;
}

export function listeningPermissions(_mode: SessionMode): ListeningPermissions {
  return { pause: true, replay: true, seek: true };
}

export function assertListeningActionAllowed(
  _mode: SessionMode,
  _action: ListeningCandidateAction,
): void {}
