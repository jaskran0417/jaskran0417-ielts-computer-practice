import { describe, expect, it } from 'vitest';
import { listeningPlaybackPolicy } from './playback-policy';

describe('listeningPlaybackPolicy', () => {
  it('blocks candidate pause, seek, replay and restart in Mock mode', () => {
    expect(listeningPlaybackPolicy('MOCK')).toEqual({
      canPause: false,
      canSeek: false,
      canReplayPart: false,
      canRestart: false,
      canChangeVolume: true,
    });
  });

  it('allows learning playback controls in Practice mode', () => {
    expect(listeningPlaybackPolicy('PRACTICE')).toEqual({
      canPause: true,
      canSeek: true,
      canReplayPart: true,
      canRestart: true,
      canChangeVolume: true,
    });
  });
});
