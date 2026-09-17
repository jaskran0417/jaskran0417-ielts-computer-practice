import { describe, expect, it } from 'vitest';
import { sampleReadingTest } from './sample-reading';

describe('sample Reading student payload', () => {
  it('contains ordered questions but no protected answers', () => {
    const questions = sampleReadingTest.modules[0].sections.flatMap((section) =>
      section.questionGroups.flatMap((group) => group.questions),
    );

    expect(questions.map((question) => question.number)).toEqual([1, 2, 3, 4]);
    expect(JSON.stringify(sampleReadingTest)).not.toContain('correctAnswer');
    expect(JSON.stringify(sampleReadingTest)).not.toContain('canonicalAnswer');
  });
});
