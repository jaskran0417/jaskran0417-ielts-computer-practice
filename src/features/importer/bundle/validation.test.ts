import { describe, expect, it } from 'vitest';
import type { SourceDocumentRecord } from '../local/import-repository';
import type {
  ImportBundle,
  ImportSourceAssignment,
  ImportSourceRole,
  PageRange,
} from './types';
import {
  publicationReadiness,
  validateImportBundleSources,
} from './validation';

function sourceDocument(id = 'doc-1'): SourceDocumentRecord {
  return {
    id,
    name: 'Reading_Test_1.pdf',
    mediaType: 'application/pdf',
    sizeBytes: 10_000,
    kind: 'PDF',
    createdAtMs: 1_000,
  };
}

function assignment(
  documentId: string,
  role: ImportSourceRole,
  pageRanges: PageRange[],
): ImportSourceAssignment {
  return {
    id: `${documentId}-${role}`,
    documentId,
    role,
    pageRanges,
    requiredForPublication: true,
  };
}

function readingBundle(input?: {
  assignments?: ImportSourceAssignment[];
  structuredDraft?: ImportBundle['structuredDraft'];
}): ImportBundle {
  return {
    id: 'bundle-1',
    testId: 'test-1',
    module: 'READING',
    title: 'Reading Test 1',
    sourceDocuments: [sourceDocument()],
    extractedFields: [],
    assignments: input?.assignments ?? [],
    structuredDraft: input?.structuredDraft ?? null,
    status: 'COLLECTING_SOURCES',
    updatedAtMs: 1_000,
  };
}

describe('validateImportBundleSources', () => {
  it('accepts Reading question pages and answer pages from the same PDF', () => {
    const bundle = readingBundle({
      assignments: [
        assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 12 }]),
        assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
      ],
    });

    expect(validateImportBundleSources(bundle)).toEqual({ ok: true });
  });

  it('rejects overlapping question and answer page roles', () => {
    const bundle = readingBundle({
      assignments: [
        assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 13 }]),
        assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
      ],
    });

    expect(validateImportBundleSources(bundle)).toEqual({
      ok: false,
      errors: ['Page 13 cannot be both QUESTION_MATERIAL and ANSWER_KEY'],
    });
  });

  it('rejects invalid page ranges', () => {
    const bundle = readingBundle({
      assignments: [
        assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 5, endPage: 3 }]),
        assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
      ],
    });

    expect(validateImportBundleSources(bundle)).toEqual({
      ok: false,
      errors: ['QUESTION_MATERIAL has invalid page range 5-3'],
    });
  });

  it('allows supporting evidence to overlap semantic source roles', () => {
    const bundle = readingBundle({
      assignments: [
        assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 12 }]),
        assignment('doc-1', 'SUPPORTING_EVIDENCE', [{ startPage: 3, endPage: 3 }]),
        assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
      ],
    });

    expect(validateImportBundleSources(bundle)).toEqual({ ok: true });
  });
});

describe('publicationReadiness', () => {
  it('blocks Reading publication when no answer key is assigned', () => {
    const bundle = readingBundle({
      assignments: [
        assignment('doc-1', 'QUESTION_MATERIAL', [{ startPage: 1, endPage: 12 }]),
      ],
    });

    expect(publicationReadiness(bundle).reasons).toContain(
      'Reading requires an answer key before it can be auto-scored',
    );
  });

  it('blocks Reading publication when no question material is assigned', () => {
    const bundle = readingBundle({
      assignments: [
        assignment('doc-1', 'ANSWER_KEY', [{ startPage: 13, endPage: 13 }]),
      ],
    });

    expect(publicationReadiness(bundle).reasons).toContain(
      'Reading requires question material',
    );
  });
});
