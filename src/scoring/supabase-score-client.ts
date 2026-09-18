interface RpcError {
  message: string;
}

interface RpcResult<T> {
  data: T | null;
  error: RpcError | null;
}

export interface ScoreRpcClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<RpcResult<unknown>>;
}

export interface ObjectiveAttemptScore {
  attemptId: string;
  testVersionId: string;
  rawScore: number;
  totalQuestions: number;
}

function parseScore(value: unknown): ObjectiveAttemptScore {
  if (!value || typeof value !== 'object') {
    throw new Error('Scoring RPC returned no result');
  }

  const row = value as Record<string, unknown>;
  const attemptId = row.attempt_id;
  const testVersionId = row.test_version_id;
  const rawScore = row.raw_score;
  const totalQuestions = row.total_questions;

  if (
    typeof attemptId !== 'string' ||
    typeof testVersionId !== 'string' ||
    typeof rawScore !== 'number' ||
    typeof totalQuestions !== 'number'
  ) {
    throw new Error('Scoring RPC returned an invalid result');
  }

  return {
    attemptId,
    testVersionId,
    rawScore,
    totalQuestions,
  };
}

export class SupabaseScoreClient {
  constructor(private readonly client: ScoreRpcClient) {}

  async scoreAttempt(attemptId: string): Promise<ObjectiveAttemptScore> {
    const { data, error } = await this.client.rpc('score_objective_attempt', {
      p_attempt_id: attemptId,
    });

    if (error) {
      throw new Error(`Unable to score objective attempt: ${error.message}`);
    }

    return parseScore(data);
  }
}
