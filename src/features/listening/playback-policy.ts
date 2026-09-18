import type { SessionMode } from '../../session/types';

export interface ListeningPlaybackPolicy {
  canPause: boolean;
  canSeek: boolean;
  canReplayPart: boolean;
  canRestart: boolean;
  canChangeVolume: boolean;
}

export function listeningPlaybackPolicy(
  mode: SessionMode,
): ListeningPlaybackPolicy {
  if (mode === 'MOCK') {
    return {
      canPause: false,
      canSeek: false,
      canReplayPart: false,
      canRestart: false,
      canChangeVolume: true,
    };
  }

  return {
    canPause: true,
    canSeek: true,
    canReplayPart: true,
    canRestart: true,
    canChangeVolume: true,
  };
}
