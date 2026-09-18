import { describe, expect, it } from 'vitest';
import type { PreparedReadingPublication } from './import-publication';
import { SupabaseImportedTestPublisher } from './supabase-publisher';

function prepared(): PreparedReadingPublication {
  return {
    studentPackage: {
      id: '00000000-0000-0000-0000-000000000001',
      versionId: 'local-version',
      title: 'Imported Reading',
      durationSeconds: 3600,
      modules: [
        {
          id: 'reading-local',
          kind: 'READING',
          title: 'Reading',
          sections: [],
        },
      ],
    },
    protectedAnswers: {
      'q-1': {
        questionNumber: 1,
        canonical: ['A'],
        alternatives: [],
        normalization: {
          caseSensitive: false,
          collapseWhitespace: true,
          punctuation: 'STRICT',
        },
        sourceEvidence: [],
        verificationState: 'VERIFIED',
      },
    },
  };
}

describe('SupabaseImportedTestPublisher', () => {
  it('publishes student content and protected answers through separate RPC arguments', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = {
      async rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return {
          data: {
            test_id: '00000000-0000-0000-0000-000000000001',
            version_id: '00000000-0000-0000-0000-000000000002',
            version_number: 3,
          },
          error: null,
        };
      },
    };

    const publisher = new SupabaseImportedTestPublisher(client);
    const result = await publisher.publish({
      ...prepared(),
      title: 'Imported Reading',
      testId: '00000000-0000-0000-0000-000000000001',
    });

    expect(result).toEqual({
      testId: '00000000-0000-0000-0000-000000000001',
      versionId: '00000000-0000-0000-0000-000000000002',
      versionNumber: 3,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.name).toBe('publish_imported_reading_test');
    expect(calls[0]?.args).toEqual({
      p_test_id: '00000000-0000-0000-0000-000000000001',
      p_title: 'Imported Reading',
      p_student_content: prepared().studentPackage,
      p_answers: prepared().protectedAnswers,
    });

    expect(JSON.stringify(calls[0]?.args.p_student_content)).not.toContain('canonical');
    expect(JSON.stringify(calls[0]?.args.p_answers)).toContain('canonical');
  });

  it('surfaces a failed atomic publication instead of pretending it succeeded', async () => {
    const client = {
      async rpc() {
        return {
          data: null,
          error: { message: 'permission denied' },
        };
      },
    };

    const publisher = new SupabaseImportedTestPublisher(client);

    await expect(
      publisher.publish({
        ...prepared(),
        title: 'Imported Reading',
      }),
    ).rejects.toThrow('Unable to publish imported Reading test: permission denied');
  });
});
