import { describe, expect, it } from 'vitest';
import { questionIds } from '../exam-engine/create-attempt';
import type { StudentTestPackage } from './types';
import {
  listeningModuleFromTest,
  readingModuleFromTest,
} from './module-helpers';

const mixedTest: StudentTestPackage = {
  id: 'mixed-test',
  versionId: 'mixed-v1',
  title: 'Mixed practice',
  durationSeconds: 60 * 60,
  assets: [
    {
      id: 'audio-1',
      url: 'blob:audio-1',
      alt: 'Listening Part 1 recording',
      kind: 'AUDIO',
    },
  ],
  modules: [
    {
      id: 'listening',
      kind: 'LISTENING',
      title: 'Listening',
      finalReviewSeconds: 120,
      sections: [
        {
          id: 'listening-part-1',
          title: 'Part 1',
          partNumber: 1,
          audioAssetId: 'audio-1',
          questionGroups: [
            {
              id: 'listening-group-1',
              instruction: 'Choose the correct answer.',
              questions: [
                {
                  id: 'lq1',
                  number: 1,
                  type: 'SINGLE_CHOICE',
                  prompt: 'Listening question',
                  options: [
                    { id: 'A', label: 'Alpha' },
                    { id: 'B', label: 'Bravo' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'reading',
      kind: 'READING',
      title: 'Reading',
      sections: [
        {
          id: 'reading-section-1',
          title: 'Passage 1',
          passage: {
            id: 'reading-passage-1',
            title: 'Sample passage',
            paragraphs: ['Sample text'],
          },
          questionGroups: [
            {
              id: 'reading-group-1',
              instruction: 'Answer the question.',
              questions: [
                {
                  id: 'rq1',
                  number: 1,
                  type: 'GAP_FILL',
                  prompt: 'Reading question',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe('module helpers', () => {
  it('finds Reading and Listening modules by kind rather than array position', () => {
    expect(readingModuleFromTest(mixedTest).id).toBe('reading');
    expect(listeningModuleFromTest(mixedTest).id).toBe('listening');
  });

  it('collects question IDs across Reading and Listening modules', () => {
    expect(questionIds(mixedTest)).toEqual(['lq1', 'rq1']);
  });

  it('throws a clear error when a requested module is absent', () => {
    const readingOnly: StudentTestPackage = {
      ...mixedTest,
      modules: [readingModuleFromTest(mixedTest)],
    };

    expect(() => listeningModuleFromTest(readingOnly)).toThrow(
      'Listening module is not present in this test',
    );
  });
});
