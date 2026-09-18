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

  it('keeps diagram questions blocked until their answer anchor is explicitly confirmed', () => {
    const bundle: ImportBundle = {
      id: 'bundle-visual',
      module: 'READING',
      title: 'Visual Reading Test',
      sourceDocuments: [
        {
          id: 'pdf-visual',
          name: 'visual-reading.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 100,
          kind: 'PDF',
          createdAtMs: 1,
        },
      ],
      assignments: [
        {
          sourceDocumentId: 'pdf-visual',
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 2 }],
        },
        {
          sourceDocumentId: 'pdf-visual',
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 3, endPage: 3 }],
        },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 2,
    };

    const passageField = (id: string, pageNumber: number, value: string): ImportFieldRecord => ({
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
            documentId: 'pdf-visual',
            pageNumber,
            method: 'PDF_TEXT',
          },
        },
      },
    });

    const draft: ImportDraft = {
      id: 'draft-visual',
      testId: 'test-visual',
      sourceDocuments: bundle.sourceDocuments,
      fields: [
        passageField(
          'page-1',
          1,
          ['Passage 1', 'A Visual Passage', 'The outer layer is the corona.'].join('\n'),
        ),
        passageField(
          'page-2',
          2,
          [
            'Questions 1-1',
            'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage.',
            '1. Outer layer',
          ].join('\n'),
        ),
        passageField('page-3', 3, ['Answers', '1. corona'].join('\n')),
      ],
      updatedAtMs: 2,
    };

    const model = buildReadingImportModel({
      bundle,
      draft,
      visualRegions: [
        {
          id: 'diagram-1',
          sourceDocumentId: 'pdf-visual',
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


  it('accepts an explicitly confirmed visual anchor and clears the visual blocker', () => {
    const bundle: ImportBundle = {
      id: 'bundle-confirmed-visual',
      module: 'READING',
      title: 'Confirmed Visual Reading',
      sourceDocuments: [{
        id: 'pdf-1',
        name: 'reading.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 100,
        kind: 'PDF',
        createdAtMs: 1,
      }],
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
      visualAnchorConfirmations: {
        'q-1': { x: 0.6, y: 0.25, width: 0.22, height: 0.07 },
      },
      status: 'STRUCTURING',
      updatedAtMs: 2,
    };
    const draft: ImportDraft = {
      id: 'draft-confirmed-visual',
      testId: 'test-confirmed-visual',
      sourceDocuments: bundle.sourceDocuments,
      fields: [
        field('v1', 1, ['Passage 1', 'Visual Passage', 'The corona is outermost.'].join('\n')),
        field('v2', 2, [
          'Questions 1-1',
          'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage.',
          '1. Outer layer',
        ].join('\n')),
        field('v3', 3, ['Answers', '1. corona'].join('\n')),
      ],
      updatedAtMs: 2,
    };

    const model = buildReadingImportModel({
      bundle,
      draft,
      visualRegions: [{
        id: 'diagram-confirmed',
        sourceDocumentId: 'pdf-1',
        pageNumber: 2,
        kind: 'DIAGRAM',
        crop: { x: 0, y: 0, width: 1, height: 1 },
      }],
    });

    expect(model.visualAnchors).toContainEqual(expect.objectContaining({
      questionNumber: 1,
      anchor: { x: 0.6, y: 0.25, width: 0.22, height: 0.07 },
      verificationState: 'CONFIRMED',
    }));
    expect(model.semanticReviewItems).not.toContainEqual(
      expect.objectContaining({ kind: 'VISUAL_ANCHOR', questionNumber: 1, state: 'REVIEW_REQUIRED' }),
    );
    expect(model.canPublish).toBe(true);
  });

  it('turns an explicitly reviewed ambiguous answer into a confirmed protected definition', () => {
    const bundle: ImportBundle = {
      id: 'bundle-answer-review',
      module: 'READING',
      title: 'Answer Review Reading',
      sourceDocuments: [{
        id: 'pdf-1',
        name: 'reading.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 100,
        kind: 'PDF',
        createdAtMs: 1,
      }],
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
      semanticConfirmations: {
        'answer-q-1': 'ninety percent | 90 percent | 90%',
      },
      status: 'STRUCTURING',
      updatedAtMs: 2,
    };
    const draft: ImportDraft = {
      id: 'draft-answer-review',
      testId: 'test-answer-review',
      sourceDocuments: bundle.sourceDocuments,
      fields: [
        field('a1', 1, ['Passage 1', 'A Passage', 'Ninety percent is plastic.'].join('\n')),
        field('a2', 2, [
          'Questions 1-1',
          'Answer the questions using NO MORE THAN TWO WORDS AND/OR A NUMBER.',
          '1. What proportion is plastic?',
        ].join('\n')),
        field('a3', 3, ['Answers', '1. ninety/90 percent/per cent/%'].join('\n')),
      ],
      updatedAtMs: 2,
    };

    const model = buildReadingImportModel({ bundle, draft, visualRegions: [] });

    expect(model.answerCoverage.definitions['q-1']).toMatchObject({
      canonical: ['ninety percent'],
      alternatives: [['90 percent'], ['90%']],
      verificationState: 'CONFIRMED',
    });
    expect(model.semanticReviewItems.find((item) => item.id === 'answer-q-1')).toMatchObject({
      state: 'CONFIRMED',
    });
    expect(model.canPublish).toBe(true);
  });
});
