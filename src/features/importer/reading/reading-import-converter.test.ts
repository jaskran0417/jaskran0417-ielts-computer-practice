import { describe, expect, it } from 'vitest';
import type { ImportBundle } from '../bundle/domain';
import type { ImportDraft, ImportFieldRecord } from '../local/import-repository';
import { buildReadingImportModel } from './reading-import-converter';

function field(
  id: string,
  pageNumber: number,
  value: string,
): ImportFieldRecord {
  return {
    id,
    kind: 'PASSAGE_TEXT',
    critical: true,
    verification: {
      state: 'VERIFIED',
      normalizedValue: value,
      reasons: [],
      passA: {
        value,
        confidence: null,
        evidence: {
          documentId: 'pdf-1',
          pageNumber,
          method: 'PDF_TEXT',
        },
      },
    },
  };
}

describe('buildReadingImportModel', () => {
  it('uses explicit page roles to separate question material from an answer page in the same PDF', () => {
    const bundle: ImportBundle = {
      id: 'bundle-1',
      module: 'READING',
      title: 'Reading Test',
      sourceDocuments: [
        {
          id: 'pdf-1',
          name: 'reading.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 100,
          kind: 'PDF',
          createdAtMs: 1,
        },
      ],
      assignments: [
        {
          sourceDocumentId: 'pdf-1',
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 2 }],
        },
        {
          sourceDocumentId: 'pdf-1',
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 3, endPage: 3 }],
        },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 2,
    };

    const draft: ImportDraft = {
      id: 'draft-1',
      testId: 'test-1',
      sourceDocuments: bundle.sourceDocuments,
      fields: [
        field(
          'page-1',
          1,
          ['Passage 1', 'A Test Passage', 'The outer layer is the corona.'].join('\n'),
        ),
        field(
          'page-2',
          2,
          [
            'Questions 1-1',
            'Answer the questions using NO MORE THAN TWO WORDS.',
            '1. What is the outer layer called?',
          ].join('\n'),
        ),
        field('page-3', 3, ['Answers', '1. (The) corona'].join('\n')),
      ],
      updatedAtMs: 2,
    };

    const model = buildReadingImportModel({
      bundle,
      draft,
      visualRegions: [],
    });

    expect(model.structuredDraft.sections).toHaveLength(1);
    expect(model.structuredDraft.sections[0]?.questionGroups[0]?.questions).toHaveLength(1);
    expect(model.structuredDraft.sections[0]?.passageText.join(' ')).not.toContain('Answers');
    expect(model.answerCoverage.definitions['q-1']).toMatchObject({
      questionNumber: 1,
      canonical: ['corona'],
      verificationState: 'VERIFIED',
    });
    expect(model.answerCoverage.definitions['q-1']?.alternatives.flat()).toContain('the corona');
    expect(model.answerCoverage.blockingReasons).toEqual([]);
  });

  it('does not silently convert an arbitrary screenshot without Reading structure', () => {
    const bundle: ImportBundle = {
      id: 'bundle-2',
      module: 'READING',
      title: 'Random screenshot',
      sourceDocuments: [
        {
          id: 'img-1',
          name: 'random.png',
          mediaType: 'image/png',
          sizeBytes: 50,
          kind: 'IMAGE',
          createdAtMs: 1,
        },
      ],
      assignments: [
        { sourceDocumentId: 'img-1', role: 'QUESTION_MATERIAL' },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 2,
    };

    const draft: ImportDraft = {
      id: 'draft-2',
      testId: 'test-2',
      sourceDocuments: bundle.sourceDocuments,
      fields: [
        {
          ...field('image-text', 1, 'Settings\nWi-Fi\nBattery 72%'),
          verification: {
            ...field('image-text', 1, 'Settings\nWi-Fi\nBattery 72%').verification,
            passA: {
              value: 'Settings\nWi-Fi\nBattery 72%',
              confidence: 95,
              evidence: {
                documentId: 'img-1',
                pageNumber: 1,
                method: 'OCR_A',
              },
            },
          },
        },
      ],
      updatedAtMs: 2,
    };

    const model = buildReadingImportModel({
      bundle,
      draft,
      visualRegions: [],
    });

    expect(model.structuredDraft.sections).toHaveLength(0);
    expect(model.semanticReviewItems).toContainEqual(
      expect.objectContaining({
        kind: 'DOCUMENT_STRUCTURE',
        state: 'REVIEW_REQUIRED',
        critical: true,
      }),
    );
    expect(model.canPublish).toBe(false);
  });

  it('blocks publication until a visual question answer anchor is reviewed', () => {
    const bundle: ImportBundle = {
      id: 'bundle-visual',
      module: 'READING',
      title: 'Visual Reading Test',
      sourceDocuments: [
        {
          id: 'pdf-1',
          name: 'reading.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 100,
          kind: 'PDF',
          createdAtMs: 1,
        },
      ],
      assignments: [
        {
          sourceDocumentId: 'pdf-1',
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 2 }],
        },
        {
          sourceDocumentId: 'pdf-1',
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 3, endPage: 3 }],
        },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 2,
    };

    const draft: ImportDraft = {
      id: 'draft-visual',
      testId: 'test-visual',
      sourceDocuments: bundle.sourceDocuments,
      fields: [
        field(
          'page-1',
          1,
          ['Passage 1', 'A Visual Passage', 'The outer layer is the corona.'].join('\n'),
        ),
        field(
          'page-2',
          2,
          [
            'Questions 1-1',
            'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage.',
            '1. Outer layer',
          ].join('\n'),
        ),
        field('page-3', 3, ['Answers', '1. corona'].join('\n')),
      ],
      updatedAtMs: 2,
    };

    const model = buildReadingImportModel({
      bundle,
      draft,
      visualRegions: [
        {
          id: 'diagram-page-2',
          sourceDocumentId: 'pdf-1',
          pageNumber: 2,
          kind: 'DIAGRAM',
          crop: { x: 0.1, y: 0.2, width: 0.8, height: 0.5 },
        },
      ],
    });

    expect(model.semanticReviewItems).toContainEqual(
      expect.objectContaining({
        kind: 'VISUAL_ANCHOR',
        questionNumber: 1,
        state: 'REVIEW_REQUIRED',
      }),
    );
    expect(model.canPublish).toBe(false);
  });

});
