import { describe, expect, it } from 'vitest';
import { sampleReadingTest } from '../test-schema/sample-reading';
import { createAttempt } from './create-attempt';
import { remainingSeconds } from './time';

describe('remainingSeconds', () => {
  it('derives remaining time from timestamps instead of decrementing state', () => {
    const state = createAttempt(sampleReadingTest, 1_000);
    expect(remainingSeconds(state, 11_000)).toBe(3590);
    expect(remainingSeconds(state, 3_701_000)).toBe(0);
  });
});
