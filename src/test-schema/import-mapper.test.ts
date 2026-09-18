import { describe, expect, it } from 'vitest';
import type { ImportDraft } from '../features/importer/local/import-repository';
import type { StudentTestPackage } from './types';
import { prepareImportedTestForPublication } from './import-mapper';

function studentPackage(): StudentTestPackage {
  return {
    id: 'test-1',
    versionId: 'version-1',
    title: 'Imported Reading',
    durationSeconds: 3600,
    modules: [
      {
        id: 'reading-1',
        kind: 'READING',
        title: 'Reading',
        sections: [
          {
            id: 'section-1',
            title: 'Passage 1',
            passage: {
              id: 'passage-1',
              title: 'Urban spaces',
              paragraphs: ['A passage imported from a verified source.'],
            },
            questionGroups: [
              {
                id: 'group-1',
                instruction: 'Choose the correct answer.',
                questions: [
                  {
                    id: 'q1',
                    number: 1,
                    type: 'SINGLE_CHOICE',
                    prompt: 'Which option is supported?',
                    options: [
                      { id: 'A', label: 'Option A' },
                      { id: 'B', label: 'Option B' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function draft(state: 'VERIFIED' | 'CONFIRMED' | 'REVIEW_REQUIRED' | 'UNREADABLE'): ImportDraft {
  return {
    id: 'draft-1',
    testId: 'test-1',
    sourceDocuments: [],
    fields: [
      {
        id: 'instruction-1',
        kind: 'INSTRUCTION',
        critical: true,
        verification: {
          state,
          normalizedValue: state === 'VERIFIED' ? 'Choose the correct answer.' : null,
          reasons: state === 'REVIEW_REQUIRED' ? ['Passes disagree'] : [],
        },
        confirmedValue: state === 'CONFIRMED' ? 'Choose the correct answer.' : undefined,
      },
    ],
    updatedAtMs: 2_000,
  };
}

describe('prepareImportedTestForPublication', () => {
  it('allows verified critical content while keeping protected answers separate', () => {
    const result = prepareImportedTestForPublication({
      draft: draft('VERIFIED'),
      studentPackage: studentPackage(),
      protectedAnswers: { q1: 'A' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected publishable result');
    expect(result.protectedAnswers).toEqual({ q1: 'A' });
    expect(JSON.stringify(result.studentPackage)).not.toContain('protectedAnswers');
    expect(JSON.stringify(result.studentPackage)).not.toContain('correctAnswer');
    expect(JSON.stringify(result.studentPackage)).not.toContain('answerDefinitions');
  });

  it('allows human-confirmed critical content', () => {
    const result = prepareImportedTestForPublication({
      draft: draft('CONFIRMED'),
      studentPackage: studentPackage(),
      protectedAnswers: { q1: 'A' },
    });

    expect(result.ok).toBe(true);
  });

  it('blocks publication while any critical field requires review', () => {
    const result = prepareImportedTestForPublication({
      draft: draft('REVIEW_REQUIRED'),
      studentPackage: studentPackage(),
      protectedAnswers: { q1: 'A' },
    });

    expect(result).toEqual({
      ok: false,
      blockingFieldIds: ['instruction-1'],
      reasons: ['Critical imported fields are unresolved'],
    });
  });

  it('blocks publication when a student payload contains a protected answer key at runtime', () => {
    const unsafe = studentPackage() as StudentTestPackage & { correctAnswer: string };
    unsafe.correctAnswer = 'A';

    const result = prepareImportedTestForPublication({
      draft: draft('VERIFIED'),
      studentPackage: unsafe,
      protectedAnswers: { q1: 'A' },
    });

    expect(result).toEqual({
      ok: false,
      blockingFieldIds: [],
      reasons: ['Student payload contains protected answer data'],
    });
  });
});
