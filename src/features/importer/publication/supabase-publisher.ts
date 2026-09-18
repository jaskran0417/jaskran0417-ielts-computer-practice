import type { PreparedReadingPublication } from './import-publication';

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SupabaseRpcClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<RpcResult<unknown>>;
}

export interface ImportedTestPublishResult {
  testId: string;
  versionId: string;
  versionNumber: number;
}

interface PublishInput extends PreparedReadingPublication {
  title: string;
  testId?: string;
}

function parsePublishResult(value: unknown): ImportedTestPublishResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Publication RPC returned no result');
  }

  const row = value as Record<string, unknown>;
  const testId = row.test_id;
  const versionId = row.version_id;
  const versionNumber = row.version_number;

  if (
    typeof testId !== 'string' ||
    typeof versionId !== 'string' ||
    typeof versionNumber !== 'number'
  ) {
    throw new Error('Publication RPC returned an invalid result');
  }

  return {
    testId,
    versionId,
    versionNumber,
  };
}

export class SupabaseImportedTestPublisher {
  constructor(private readonly client: SupabaseRpcClient) {}

  async publish(input: PublishInput): Promise<ImportedTestPublishResult> {
    const { data, error } = await this.client.rpc(
      'publish_imported_reading_test',
      {
        p_test_id: input.testId ?? null,
        p_title: input.title,
        p_student_content: input.studentPackage,
        p_answers: input.protectedAnswers,
      },
    );

    if (error) {
      throw new Error(
        `Unable to publish imported Reading test: ${error.message}`,
      );
    }

    return parsePublishResult(data);
  }
}
