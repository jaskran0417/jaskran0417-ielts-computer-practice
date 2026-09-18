import { describe, expect, it } from 'vitest';
import type { PreparedReadingPublication } from '../features/importer/publication/import-publication';
import { LocalImportedTestPublisher } from './local-imported-test-publisher';

function prepared(): PreparedReadingPublication {
  return {
    studentPackage: {
      id: 'test-local',
      versionId: 'version-local',
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

describe('LocalImportedTestPublisher', () => {
  it('stores student content and protected answers in separate repositories', async () => {
    const savedTests: PreparedReadingPublication['studentPackage'][] = [];
    const savedAnswers: Array<{
      versionId: string;
      answers: PreparedReadingPublication['protectedAnswers'];
    }> = [];

    const publisher = new LocalImportedTestPublisher(
      {
        async saveLocalTest(test) {
          savedTests.push(test);
        },
        async listPublishedTests() {
          return [];
        },
        async loadPublishedTest() {
          throw new Error('not needed');
        },
      },
      {
        async save(versionId, answers) {
          savedAnswers.push({ versionId, answers });
        },
        async load() {
          return null;
        },
      },
    );

    await expect(publisher.publish(prepared())).resolves.toEqual({
      testId: 'test-local',
      versionId: 'version-local',
    });

    expect(savedTests).toEqual([prepared().studentPackage]);
    expect(savedAnswers).toEqual([
      {
        versionId: 'version-local',
        answers: prepared().protectedAnswers,
      },
    ]);
    expect(JSON.stringify(savedTests[0])).not.toContain('canonical');
  });
});
