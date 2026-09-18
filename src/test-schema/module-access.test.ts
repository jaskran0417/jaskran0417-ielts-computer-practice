import { describe, expect, it } from 'vitest';
import { sampleListeningTest } from './sample-listening';
import { sampleReadingTest } from './sample-reading';
import {
  allQuestionsForTest,
  listeningModuleFromTest,
  readingModuleFromTest,
} from './module-access';

describe('student module access', () => {
  it('returns ordered questions for Reading and Listening packages', () => {
    expect(allQuestionsForTest(sampleReadingTest).map((question) => question.number))
      .toEqual([1, 2, 3, 4]);
    expect(allQuestionsForTest(sampleListeningTest).map((question) => question.number))
      .toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
  });

  it('narrows the requested module kind and rejects the wrong package', () => {
    expect(readingModuleFromTest(sampleReadingTest).kind).toBe('READING');
    expect(listeningModuleFromTest(sampleListeningTest).kind).toBe('LISTENING');
    expect(() => readingModuleFromTest(sampleListeningTest)).toThrow(
      'Test does not contain a Reading module',
    );
    expect(() => listeningModuleFromTest(sampleReadingTest)).toThrow(
      'Test does not contain a Listening module',
    );
  });
});
