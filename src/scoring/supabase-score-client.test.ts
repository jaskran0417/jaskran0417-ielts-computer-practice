import { describe, expect, it, vi } from 'vitest';
import { SupabaseScoreClient } from './supabase-score-client';

describe('SupabaseScoreClient', () => {
  it('requests protected server-side scoring and returns only score metadata', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        attempt_id: 'attempt-1',
        test_version_id: 'version-1',
        raw_score: 34,
        total_questions: 40,
      },
      error: null,
    }));

    const client = new SupabaseScoreClient({ rpc });
    const score = await client.scoreAttempt('attempt-1');

    expect(rpc).toHaveBeenCalledWith('score_objective_attempt', {
      p_attempt_id: 'attempt-1',
    });
    expect(score).toEqual({
      attemptId: 'attempt-1',
      testVersionId: 'version-1',
      rawScore: 34,
      totalQuestions: 40,
    });
    expect(JSON.stringify(score)).not.toMatch(/canonical|alternatives|answer/i);
  });

  it('surfaces server-side scoring failures without inventing a score', async () => {
    const client = new SupabaseScoreClient({
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'Attempt must be submitted before scoring' },
      })),
    });

    await expect(client.scoreAttempt('attempt-1')).rejects.toThrow(
      'Unable to score objective attempt: Attempt must be submitted before scoring',
    );
  });
});
