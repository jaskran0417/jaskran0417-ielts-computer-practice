import { describe, expect, it } from 'vitest';
import { assertListeningActionAllowed, listeningPermissions } from './listening-policy';

describe('listening policy', () => {
  it('allows candidate pause replay and seek in Practice mode', () => {
    expect(listeningPermissions('PRACTICE')).toEqual({ pause: true, replay: true, seek: true });
    expect(() => assertListeningActionAllowed('PRACTICE', 'PAUSE')).not.toThrow();
    expect(() => assertListeningActionAllowed('PRACTICE', 'REPLAY')).not.toThrow();
    expect(() => assertListeningActionAllowed('PRACTICE', 'SEEK')).not.toThrow();
  });

  it.each(['PAUSE', 'REPLAY', 'SEEK'] as const)('rejects candidate %s in Mock mode', (action) => {
    expect(() => assertListeningActionAllowed('MOCK', action)).toThrow(
      `Mock Listening does not allow candidate ${action.toLowerCase()}`,
    );
  });

  it('reports every candidate control disabled in Mock mode', () => {
    expect(listeningPermissions('MOCK')).toEqual({ pause: false, replay: false, seek: false });
  });
});
