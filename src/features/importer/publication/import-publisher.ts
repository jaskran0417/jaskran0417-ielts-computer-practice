import type { AnswerDefinition } from '../../../scoring/answer-definition';
import type { StudentTestPackage } from '../../../test-schema/types';

export type ImportPublicationProfile = 'LOCAL_OFFLINE' | 'CLOUD_SECURE';

export interface ImportVerificationRecordInput {
  fieldKey: string;
  fieldKind:
    | 'QUESTION_TEXT'
    | 'INSTRUCTION'
    | 'PASSAGE_TEXT'
    | 'ANSWER'
    | 'OPTION'
    | 'OTHER';
  critical: boolean;
  state: 'VERIFIED' | 'CONFIRMED' | 'REVIEW_REQUIRED' | 'UNREADABLE';
  normalizedValue: string | null;
  confirmedValue: string | null;
  reasons: string[];
}

export interface ImportPublishInput {
  bundleId: string;
  title: string;
  studentPackage: StudentTestPackage;
  protectedAnswers: Record<string, AnswerDefinition>;
  verificationRecords: ImportVerificationRecordInput[];
}

export interface ImportPublishResult {
  testId: string;
  versionId: string;
  versionNumber: number;
}

export interface ImportPublisher {
  readonly profile: ImportPublicationProfile;
  publish(input: ImportPublishInput): Promise<ImportPublishResult>;
}

export interface LocalPublishedTestStore {
  savePublishedTest(input: {
    testId: string;
    versionId: string;
    versionNumber: number;
    studentPackage: StudentTestPackage;
  }): Promise<void>;
}

export interface LocalProtectedAnswerStore {
  saveProtectedAnswers(
    versionId: string,
    answers: Record<string, AnswerDefinition>,
  ): Promise<void>;
}

export class LocalImportPublisher implements ImportPublisher {
  readonly profile = 'LOCAL_OFFLINE' as const;

  constructor(
    private readonly tests: LocalPublishedTestStore,
    private readonly answers: LocalProtectedAnswerStore,
  ) {}

  async publish(input: ImportPublishInput): Promise<ImportPublishResult> {
    const versionNumber = 1;
    await this.tests.savePublishedTest({
      testId: input.studentPackage.id,
      versionId: input.studentPackage.versionId,
      versionNumber,
      studentPackage: input.studentPackage,
    });
    await this.answers.saveProtectedAnswers(
      input.studentPackage.versionId,
      input.protectedAnswers,
    );

    return {
      testId: input.studentPackage.id,
      versionId: input.studentPackage.versionId,
      versionNumber,
    };
  }
}

interface RpcError {
  message: string;
}

interface SupabaseRpcLike {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
}

function publicationRow(data: unknown): {
  test_id: string;
  version_id: string;
  version_number: number;
} {
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Publication RPC returned no result');
  }

  const row = raw as Record<string, unknown>;
  if (
    typeof row.test_id !== 'string' ||
    typeof row.version_id !== 'string' ||
    typeof row.version_number !== 'number'
  ) {
    throw new Error('Publication RPC returned an invalid result');
  }

  return {
    test_id: row.test_id,
    version_id: row.version_id,
    version_number: row.version_number,
  };
}

export class SupabaseImportPublisher implements ImportPublisher {
  readonly profile = 'CLOUD_SECURE' as const;

  constructor(private readonly client: SupabaseRpcLike) {}

  async publish(input: ImportPublishInput): Promise<ImportPublishResult> {
    const { data, error } = await this.client.rpc('publish_import_bundle', {
      p_bundle_id: input.bundleId,
      p_student_content: input.studentPackage,
      p_answer_definitions: input.protectedAnswers,
      p_verification_records: input.verificationRecords,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = publicationRow(data);
    return {
      testId: row.test_id,
      versionId: row.version_id,
      versionNumber: row.version_number,
    };
  }
}
