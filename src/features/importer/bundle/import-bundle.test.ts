import { describe, expect, it } from 'vitest';
import type { SourceDocumentRecord } from '../local/import-repository';
import type { ImportBundle } from './domain';
import { assignSourceRole, validateImportBundle } from './import-bundle';

const pdf: SourceDocumentRecord = {
  id: 'pdf-1',
  name: 'reading.pdf',
  mediaType: 'application/pdf',
  sizeBytes: 1024,
  kind: 'PDF',
  createdAtMs: 1,
};

function bundle(overrides: Partial<ImportBundle> = {}): ImportBundle {
  return {
    id: 'bundle-1',
    module: 'READING',
    title: 'Reading Test 1',
    sourceDocuments: [pdf],
    assignments: [],
    status: 'COLLECTING_SOURCES',
    updatedAtMs: 1,
    ...overrides,
  };
}

describe('ImportBundle', () => {
  it('requires Reading question material before structuring', () => {
    const errors = validateImportBundle(
      bundle({
        assignments: [{ sourceDocumentId: 'pdf-1', role: 'ANSWER_KEY' }],
      }),
    );

    expect(errors).toContain('Reading import requires question material');
  });

  it('allows one PDF to own question and answer page ranges', () => {
    const withQuestions = assignSourceRole(
      bundle(),
      {
        sourceDocumentId: 'pdf-1',
        role: 'QUESTION_MATERIAL',
        pageRanges: [{ startPage: 1, endPage: 12 }],
      },
      100,
    );

    const withAnswers = assignSourceRole(
      withQuestions,
      {
        sourceDocumentId: 'pdf-1',
        role: 'ANSWER_KEY',
        pageRanges: [{ startPage: 13, endPage: 13 }],
      },
      101,
    );

    expect(withAnswers.assignments).toEqual([
      {
        sourceDocumentId: 'pdf-1',
        role: 'QUESTION_MATERIAL',
        pageRanges: [{ startPage: 1, endPage: 12 }],
      },
      {
        sourceDocumentId: 'pdf-1',
        role: 'ANSWER_KEY',
        pageRanges: [{ startPage: 13, endPage: 13 }],
      },
    ]);
    expect(withAnswers.updatedAtMs).toBe(101);
  });

  it('rejects invalid page ranges and duplicate identical assignments', () => {
    const invalid = validateImportBundle(
      bundle({
        assignments: [
          {
            sourceDocumentId: 'pdf-1',
            role: 'QUESTION_MATERIAL',
            pageRanges: [{ startPage: 5, endPage: 2 }],
          },
        ],
      }),
    );

    expect(invalid).toContain('Page ranges must use positive pages with startPage <= endPage');

    const once = assignSourceRole(
      bundle(),
      {
        sourceDocumentId: 'pdf-1',
        role: 'QUESTION_MATERIAL',
        pageRanges: [{ startPage: 1, endPage: 12 }],
      },
      10,
    );

    expect(() =>
      assignSourceRole(
        once,
        {
          sourceDocumentId: 'pdf-1',
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 12 }],
        },
        11,
      ),
    ).toThrow('This source role assignment already exists');
  });
});
