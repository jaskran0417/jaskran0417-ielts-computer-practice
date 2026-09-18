import { describe, expect, it, vi } from 'vitest';
import type { AnswerDefinition } from '../../../scoring/answer-definition';
import type { StudentTestPackage } from '../../../test-schema/types';
import {
  LocalImportPublisher,
  SupabaseImportPublisher,
  type LocalProtectedAnswerStore,
  type LocalPublishedTestStore,
} from './import-publisher';

function packageFixture(): StudentTestPackage {
  return {
    id: 'test-1',
    versionId: 'version-1',
    title: 'Imported Reading',
    durationSeconds: 3600,
    modules: [{
      id: 'reading-1',
      kind: 'READING',
      title: 'Reading',
      sections: [],
    }],
  };
}

function answerFixture(): Record<string, AnswerDefinition> {
  return {
    q1: {
      kind: 'OPTION',
      questionId: 'q1',
      acceptedOptionIds: ['A'],
      policy: {
        caseSensitive: false,
        collapseWhitespace: true,
        punctuation: 'STRICT',
        orderSensitive: false,
      },
      sourceEvidence: [{ documentId: 'answers', pageNumber: 13, method: 'ANSWER_KEY_A' }],
      verificationState: 'VERIFIED',
    },
  };
}

const verificationRecords = [{
  fieldKey: 'question:q1',
  fieldKind: 'QUESTION_TEXT' as const,
  critical: true,
  state: 'VERIFIED' as const,
  normalizedValue: 'Question one',
  confirmedValue: null,
  reasons: [],
}];

describe('import publishers', () => {
  it('publishes locally without Supabase while keeping answers separate', async () => {
    const tests: LocalPublishedTestStore = {
      savePublishedTest: vi.fn().mockResolvedValue(undefined),
    };
    const answers: LocalProtectedAnswerStore = {
      saveProtectedAnswers: vi.fn().mockResolvedValue(undefined),
    };
    const publisher = new LocalImportPublisher(tests, answers);

    const result = await publisher.publish({
      bundleId: 'bundle-1',
      title: 'Imported Reading',
      studentPackage: packageFixture(),
      protectedAnswers: answerFixture(),
      verificationRecords,
    });

    expect(publisher.profile).toBe('LOCAL_OFFLINE');
    expect(tests.savePublishedTest).toHaveBeenCalledWith({
      testId: 'test-1',
      versionId: 'version-1',
      versionNumber: 1,
      studentPackage: packageFixture(),
    });
    expect(answers.saveProtectedAnswers).toHaveBeenCalledWith('version-1', answerFixture());
    expect(result).toEqual({
      testId: 'test-1',
      versionId: 'version-1',
      versionNumber: 1,
    });
  });

  it('publishes cloud-secure content only through the atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        test_id: 'test-cloud',
        version_id: 'version-cloud',
        version_number: 2,
      }],
      error: null,
    });
    const publisher = new SupabaseImportPublisher({ rpc });

    const result = await publisher.publish({
      bundleId: 'bundle-cloud',
      title: 'Imported Reading',
      studentPackage: packageFixture(),
      protectedAnswers: answerFixture(),
      verificationRecords,
    });

    expect(publisher.profile).toBe('CLOUD_SECURE');
    expect(rpc).toHaveBeenCalledWith('publish_import_bundle', {
      p_bundle_id: 'bundle-cloud',
      p_student_content: packageFixture(),
      p_answer_definitions: answerFixture(),
      p_verification_records: verificationRecords,
    });
    expect(result).toEqual({
      testId: 'test-cloud',
      versionId: 'version-cloud',
      versionNumber: 2,
    });
  });

  it('surfaces an RPC error without pretending publication succeeded', async () => {
    const publisher = new SupabaseImportPublisher({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Critical fields unresolved' },
      }),
    });

    await expect(
      publisher.publish({
        bundleId: 'bundle-cloud',
        title: 'Imported Reading',
        studentPackage: packageFixture(),
        protectedAnswers: answerFixture(),
        verificationRecords,
      }),
    ).rejects.toThrow('Critical fields unresolved');
  });
});
