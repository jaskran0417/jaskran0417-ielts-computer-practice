import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ImportBundle } from './bundle/domain';
import type { ImportDraft } from './local/import-repository';
import { ImportWorkspace } from './ImportWorkspace';

const importedDraft: ImportDraft = {
  id: 'draft-1',
  testId: 'test-1',
  sourceDocuments: [
    {
      id: 'source-1',
      name: 'practice-test.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 512,
      kind: 'PDF',
      createdAtMs: 1_000,
    },
  ],
  fields: [
    {
      id: 'instruction-1',
      kind: 'INSTRUCTION',
      critical: true,
      verification: {
        state: 'VERIFIED',
        normalizedValue: 'Choose ONE WORD ONLY.',
        reasons: [],
        passA: {
          value: 'Choose ONE WORD ONLY.',
          confidence: null,
          evidence: {
            documentId: 'source-1',
            pageNumber: 1,
            method: 'PDF_TEXT',
          },
        },
        passB: {
          value: 'Choose ONE WORD ONLY.',
          confidence: 98,
          evidence: {
            documentId: 'source-1',
            pageNumber: 1,
            method: 'OCR_B',
          },
        },
      },
    },
    {
      id: 'question-1',
      kind: 'QUESTION_TEXT',
      critical: true,
      verification: {
        state: 'REVIEW_REQUIRED',
        normalizedValue: null,
        reasons: ['Independent extraction passes disagree'],
        passA: {
          value: 'The library closes at 6 pm.',
          confidence: null,
          evidence: {
            documentId: 'source-1',
            pageNumber: 2,
            method: 'PDF_TEXT',
            region: { x: 0.1, y: 0.2, width: 0.7, height: 0.08 },
          },
        },
        passB: {
          value: 'The library closes at 8 pm.',
          confidence: 82,
          evidence: {
            documentId: 'source-1',
            pageNumber: 2,
            method: 'OCR_B',
          },
        },
      },
    },
    {
      id: 'answer-2',
      kind: 'ANSWER',
      critical: true,
      verification: {
        state: 'UNREADABLE',
        normalizedValue: null,
        reasons: ['Both independent extraction passes are blank'],
      },
    },
  ],
  updatedAtMs: 2_000,
};

describe('ImportWorkspace', () => {
  it('imports a local file and exposes verification states with source evidence', async () => {
    const user = userEvent.setup();
    render(<ImportWorkspace processFile={async () => importedDraft} />);

    await user.click(screen.getByRole('button', { name: 'Reading' }));
    const file = new File(['pdf'], 'practice-test.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Add source files'), file);

    expect(await screen.findByRole('option', { name: 'practice-test.pdf' })).toBeInTheDocument();
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('REVIEW_REQUIRED')).toBeInTheDocument();
    expect(screen.getByText('UNREADABLE')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Review & Confirm QUESTION_TEXT' }));

    const evidence = screen.getByRole('region', { name: 'Source evidence' });
    expect(within(evidence).getByText('Page 2')).toBeInTheDocument();
    expect(within(evidence).getByText('PDF_TEXT')).toBeInTheDocument();
    expect(within(evidence).getByText('OCR_B')).toBeInTheDocument();
    expect(within(evidence).getByText('The library closes at 6 pm.')).toBeInTheDocument();
    expect(within(evidence).getByText('The library closes at 8 pm.')).toBeInTheDocument();
  });

  it('requires explicit confirmation and stays blocked while another critical conflict remains', async () => {
    const user = userEvent.setup();
    render(<ImportWorkspace processFile={async () => importedDraft} />);

    await user.click(screen.getByRole('button', { name: 'Reading' }));
    await user.upload(
      screen.getByLabelText('Add source files'),
      new File(['pdf'], 'practice-test.pdf', { type: 'application/pdf' }),
    );
    const reviewButton = await screen.findByRole('button', {
      name: 'Review & Confirm QUESTION_TEXT',
    });
    const reviewCard = reviewButton.closest('article');
    expect(reviewCard).not.toBeNull();
    expect(reviewButton.closest('.import-field-card-heading')).not.toBeNull();

    await user.click(reviewButton);

    const card = within(reviewCard as HTMLElement);
    const confirmedValue = card.getByRole('textbox', { name: 'Confirmed value' });
    await user.clear(confirmedValue);
    await user.type(confirmedValue, 'The library closes at 6 pm.');
    await user.click(card.getByRole('button', { name: 'Confirm value' }));

    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
    expect(screen.getByText('1 critical field still requires review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish imported test' })).toBeDisabled();
  });
  it('shows semantic Reading review items after question and answer pages are assigned', () => {
    const source = {
      id: 'reading-source',
      name: 'reading-test.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 1024,
      kind: 'PDF' as const,
      createdAtMs: 1,
    };
    const bundle: ImportBundle = {
      id: 'bundle-reading',
      module: 'READING',
      title: 'Imported Reading',
      sourceDocuments: [source],
      assignments: [
        {
          sourceDocumentId: source.id,
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 2 }],
        },
        {
          sourceDocumentId: source.id,
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 3, endPage: 3 }],
        },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 10,
    };
    const draft: ImportDraft = {
      id: 'draft-reading',
      testId: 'test-reading',
      sourceDocuments: [source],
      fields: [
        {
          id: 'page-1',
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification: {
            state: 'VERIFIED',
            normalizedValue: ['Passage 1', 'A Test Passage', 'The outer layer is the corona.'].join('\n'),
            reasons: [],
            passA: {
              value: ['Passage 1', 'A Test Passage', 'The outer layer is the corona.'].join('\n'),
              confidence: null,
              evidence: {
                documentId: source.id,
                pageNumber: 1,
                method: 'PDF_TEXT',
              },
            },
          },
        },
        {
          id: 'page-2',
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification: {
            state: 'VERIFIED',
            normalizedValue:
              ['Questions 1-1', 'Answer the questions using NO MORE THAN TWO WORDS.', '1. What is the outer layer called?'].join('\n'),
            reasons: [],
            passA: {
              value:
                ['Questions 1-1', 'Answer the questions using NO MORE THAN TWO WORDS.', '1. What is the outer layer called?'].join('\n'),
              confidence: null,
              evidence: {
                documentId: source.id,
                pageNumber: 2,
                method: 'PDF_TEXT',
              },
            },
          },
        },
        {
          id: 'page-3',
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification: {
            state: 'VERIFIED',
            normalizedValue: '1 corona',
            reasons: [],
            passA: {
              value: '1 corona',
              confidence: null,
              evidence: {
                documentId: source.id,
                pageNumber: 3,
                method: 'PDF_TEXT',
              },
            },
          },
        },
      ],
      updatedAtMs: 10,
    };

    render(
      <ImportWorkspace
        processFile={async () => draft}
        initialBundle={bundle}
        initialDraft={draft}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Structured Reading review' })).toBeInTheDocument();
    expect(screen.getByText('Passage 1 title')).toBeInTheDocument();
    expect(screen.getByText('Questions 1–1 instruction')).toBeInTheDocument();
    expect(screen.getByText('Question 1 text')).toBeInTheDocument();
    expect(screen.getByText('Question 1 accepted answer')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fields to review' })).not.toBeInTheDocument();
  });


  it('passes retained PDF visuals into the live Reading conversion model', () => {
    const source = {
      id: 'visual-reading-source',
      name: 'visual-reading.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 2048,
      kind: 'PDF' as const,
      createdAtMs: 1,
    };
    const bundle: ImportBundle = {
      id: 'visual-bundle',
      module: 'READING',
      title: 'Visual Reading Test',
      sourceDocuments: [source],
      assignments: [
        {
          sourceDocumentId: source.id,
          role: 'QUESTION_MATERIAL',
          pageRanges: [{ startPage: 1, endPage: 3 }],
        },
        {
          sourceDocumentId: source.id,
          role: 'ANSWER_KEY',
          pageRanges: [{ startPage: 4, endPage: 4 }],
        },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 10,
    };
    const draft: ImportDraft = {
      id: 'visual-draft',
      testId: 'visual-test',
      sourceDocuments: [source],
      visualAssets: [
        {
          id: 'diagram-page-3',
          sourceDocumentId: source.id,
          pageNumber: 3,
          kind: 'DIAGRAM',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,cGFnZQ==',
          crop: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
      fields: [
        {
          id: 'visual-page-1',
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification: {
            state: 'VERIFIED',
            normalizedValue: ['Passage 1', 'Visual Passage', 'The corona is the outer layer.'].join('\n'),
            reasons: [],
            passA: {
              value: ['Passage 1', 'Visual Passage', 'The corona is the outer layer.'].join('\n'),
              confidence: null,
              evidence: { documentId: source.id, pageNumber: 1, method: 'PDF_TEXT' },
            },
          },
        },
        {
          id: 'visual-page-3',
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification: {
            state: 'VERIFIED',
            normalizedValue: [
              'Questions 1-1',
              'Label the diagram below.',
              'Choose NO MORE THAN TWO WORDS from the reading passage for each answer.',
            ].join('\n'),
            reasons: [],
            passA: {
              value: [
                'Questions 1-1',
                'Label the diagram below.',
                'Choose NO MORE THAN TWO WORDS from the reading passage for each answer.',
              ].join('\n'),
              confidence: null,
              evidence: { documentId: source.id, pageNumber: 3, method: 'PDF_TEXT' },
            },
          },
        },
        {
          id: 'visual-page-4',
          kind: 'PASSAGE_TEXT',
          critical: true,
          verification: {
            state: 'VERIFIED',
            normalizedValue: '1. corona',
            reasons: [],
            passA: {
              value: '1. corona',
              confidence: null,
              evidence: { documentId: source.id, pageNumber: 4, method: 'PDF_TEXT' },
            },
          },
        },
      ],
      updatedAtMs: 10,
    };

    render(
      <ImportWorkspace
        processFile={async () => draft}
        initialBundle={bundle}
        initialDraft={draft}
      />,
    );

    expect(screen.getByText('Question 1 visual anchor')).toBeInTheDocument();
    expect(screen.getByText('Question 1 accepted answer')).toBeInTheDocument();
    expect(screen.queryByText(/Question type for 1-1 requires review/)).not.toBeInTheDocument();
  });

  it('confirms an ambiguous protected answer inline on its semantic review card', async () => {
    const user = userEvent.setup();
    const source = {
      id: 'answer-review-source',
      name: 'answer-review.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 100,
      kind: 'PDF' as const,
      createdAtMs: 1,
    };
    const bundle: ImportBundle = {
      id: 'answer-review-bundle',
      module: 'READING',
      title: 'Answer Review',
      sourceDocuments: [source],
      assignments: [
        { sourceDocumentId: source.id, role: 'QUESTION_MATERIAL', pageRanges: [{ startPage: 1, endPage: 2 }] },
        { sourceDocumentId: source.id, role: 'ANSWER_KEY', pageRanges: [{ startPage: 3, endPage: 3 }] },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 1,
    };
    const verified = (id: string, pageNumber: number, value: string) => ({
      id,
      kind: 'PASSAGE_TEXT' as const,
      critical: true,
      verification: {
        state: 'VERIFIED' as const,
        normalizedValue: value,
        reasons: [],
        passA: {
          value,
          confidence: null,
          evidence: { documentId: source.id, pageNumber, method: 'PDF_TEXT' as const },
        },
      },
    });
    const draft: ImportDraft = {
      id: 'answer-review-draft',
      testId: 'answer-review-test',
      sourceDocuments: [source],
      fields: [
        verified('ar1', 1, ['Passage 1', 'A Passage', 'Several colours are listed.'].join('\n')),
        verified('ar2', 2, [
          'Questions 1-1',
          'Answer the questions using NO MORE THAN TWO WORDS AND/OR A NUMBER.',
          '1. Which colour is listed?',
        ].join('\n')),
        verified('ar3', 3, ['Answers', '1. red/blue/green'].join('\n')),
      ],
      updatedAtMs: 1,
    };

    render(
      <ImportWorkspace
        processFile={async () => draft}
        initialBundle={bundle}
        initialDraft={draft}
      />,
    );

    const reviewText = screen.getByText('Question 1 accepted answer');
    const card = reviewText.closest('article');
    expect(card).not.toBeNull();
    const cardUi = within(card as HTMLElement);
    expect(cardUi.getByText('REVIEW_REQUIRED')).toBeInTheDocument();

    await user.click(cardUi.getByRole('button', { name: 'Review & Confirm Question 1 accepted answer' }));
    const input = cardUi.getByRole('textbox', { name: 'Accepted answers' });
    await user.clear(input);
    await user.type(input, 'red | blue | green');
    await user.click(cardUi.getByRole('button', { name: 'Confirm accepted answers' }));

    expect(cardUi.getByText('CONFIRMED')).toBeInTheDocument();
  });

  it('confirms a visual answer position inline on the visual review card', async () => {
    const user = userEvent.setup();
    const source = {
      id: 'anchor-source',
      name: 'anchor.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 100,
      kind: 'PDF' as const,
      createdAtMs: 1,
    };
    const bundle: ImportBundle = {
      id: 'anchor-bundle',
      module: 'READING',
      title: 'Anchor Reading',
      sourceDocuments: [source],
      assignments: [
        { sourceDocumentId: source.id, role: 'QUESTION_MATERIAL', pageRanges: [{ startPage: 1, endPage: 2 }] },
        { sourceDocumentId: source.id, role: 'ANSWER_KEY', pageRanges: [{ startPage: 3, endPage: 3 }] },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 1,
    };
    const verified = (id: string, pageNumber: number, value: string) => ({
      id,
      kind: 'PASSAGE_TEXT' as const,
      critical: true,
      verification: {
        state: 'VERIFIED' as const,
        normalizedValue: value,
        reasons: [],
        passA: {
          value,
          confidence: null,
          evidence: { documentId: source.id, pageNumber, method: 'PDF_TEXT' as const },
        },
      },
    });
    const draft: ImportDraft = {
      id: 'anchor-draft',
      testId: 'anchor-test',
      sourceDocuments: [source],
      visualAssets: [{
        id: 'anchor-diagram',
        sourceDocumentId: source.id,
        pageNumber: 2,
        kind: 'DIAGRAM',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,cGFnZQ==',
        crop: { x: 0, y: 0, width: 1, height: 1 },
      }],
      fields: [
        verified('an1', 1, ['Passage 1', 'A Visual Passage', 'The corona is outermost.'].join('\n')),
        verified('an2', 2, [
          'Questions 1-1',
          'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage.',
          '1. Outer layer',
        ].join('\n')),
        verified('an3', 3, ['Answers', '1. corona'].join('\n')),
      ],
      updatedAtMs: 1,
    };

    render(
      <ImportWorkspace
        processFile={async () => draft}
        initialBundle={bundle}
        initialDraft={draft}
      />,
    );

    const label = screen.getByText('Question 1 visual anchor');
    const card = label.closest('article');
    expect(card).not.toBeNull();
    const cardUi = within(card as HTMLElement);
    await user.click(cardUi.getByRole('button', { name: 'Set position for Question 1' }));

    const image = cardUi.getByRole('img', { name: 'Source visual for question 1' });
    Object.defineProperty(image, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
    });
    fireEvent.click(image, { clientX: 120, clientY: 80 });
    await user.click(cardUi.getByRole('button', { name: 'Confirm answer position' }));

    expect(cardUi.queryByText('REVIEW_REQUIRED')).not.toBeInTheDocument();
  });

  it('prepares a student-safe runnable Reading publication when Publish is pressed', async () => {
    const user = userEvent.setup();
    const source = {
      id: 'publish-source',
      name: 'publish.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 100,
      kind: 'PDF' as const,
      createdAtMs: 1,
    };
    const bundle: ImportBundle = {
      id: 'publish-bundle',
      module: 'READING',
      title: 'Published Reading',
      sourceDocuments: [source],
      assignments: [
        { sourceDocumentId: source.id, role: 'QUESTION_MATERIAL', pageRanges: [{ startPage: 1, endPage: 2 }] },
        { sourceDocumentId: source.id, role: 'ANSWER_KEY', pageRanges: [{ startPage: 3, endPage: 3 }] },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 1,
    };
    const verified = (id: string, pageNumber: number, value: string) => ({
      id,
      kind: 'PASSAGE_TEXT' as const,
      critical: true,
      verification: {
        state: 'VERIFIED' as const,
        normalizedValue: value,
        reasons: [],
        passA: {
          value,
          confidence: null,
          evidence: { documentId: source.id, pageNumber, method: 'PDF_TEXT' as const },
        },
      },
    });
    const draft: ImportDraft = {
      id: 'publish-draft',
      testId: 'publish-test',
      sourceDocuments: [source],
      fields: [
        verified('pub1', 1, ['Passage 1', 'A Passage', 'The outer layer is the corona.'].join('\n')),
        verified('pub2', 2, [
          'Questions 1-1',
          'Answer the questions using NO MORE THAN TWO WORDS.',
          '1. What is the outer layer called?',
        ].join('\n')),
        verified('pub3', 3, ['Answers', '1. corona'].join('\n')),
      ],
      updatedAtMs: 1,
    };
    const publications: unknown[] = [];

    render(
      <ImportWorkspace
        processFile={async () => draft}
        initialBundle={bundle}
        initialDraft={draft}
        onPublish={(publication) => {
          publications.push(publication);
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Publish imported test' }));

    expect(publications).toHaveLength(1);
    const publication = publications[0] as {
      studentPackage: { title: string; modules: Array<{ sections: Array<{ questionGroups: Array<{ questions: Array<{ number: number; type: string }> }> }> }> };
      protectedAnswers: Record<string, { canonical: string[] }>;
    };
    expect(publication.studentPackage.title).toBe('Published Reading');
    expect(publication.studentPackage.modules[0]?.sections[0]?.questionGroups[0]?.questions[0]).toMatchObject({
      number: 1,
      type: 'SHORT_ANSWER',
    });
    expect(publication.protectedAnswers['q-1']?.canonical).toEqual(['corona']);
    expect(JSON.stringify(publication.studentPackage)).not.toContain('canonical');
  });


  it('lets a semantic question-text blocker be reviewed and confirmed from its header card', async () => {
    const user = userEvent.setup();
    const changes: ImportBundle[] = [];
    const source = {
      id: 'semantic-source',
      name: 'semantic.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 100,
      kind: 'PDF' as const,
      createdAtMs: 1,
    };
    const bundle: ImportBundle = {
      id: 'semantic-bundle',
      module: 'READING',
      title: 'Semantic Recovery',
      sourceDocuments: [source],
      assignments: [
        { sourceDocumentId: source.id, role: 'QUESTION_MATERIAL', pageRanges: [{ startPage: 1, endPage: 2 }] },
        { sourceDocumentId: source.id, role: 'ANSWER_KEY', pageRanges: [{ startPage: 3, endPage: 3 }] },
      ],
      status: 'STRUCTURING',
      updatedAtMs: 1,
    };
    const verifiedField = (id: string, pageNumber: number, value: string) => ({
      id,
      kind: 'PASSAGE_TEXT' as const,
      critical: true,
      verification: {
        state: 'VERIFIED' as const,
        normalizedValue: value,
        reasons: [],
        passA: {
          value,
          confidence: null,
          evidence: {
            documentId: source.id,
            pageNumber,
            method: 'PDF_TEXT' as const,
          },
        },
      },
    });
    const draft: ImportDraft = {
      id: 'semantic-draft',
      testId: 'semantic-test',
      sourceDocuments: [source],
      fields: [
        verifiedField('semantic-1', 1, ['Passage 1', 'Recovery Passage', 'Passage text.'].join('\n')),
        verifiedField('semantic-2', 2, [
          'Questions 1-2',
          'Answer the questions using NO MORE THAN TWO WORDS.',
          '1. First question?',
        ].join('\n')),
        verifiedField('semantic-3', 3, ['Answers', '1. alpha', '2. beta'].join('\n')),
      ],
      updatedAtMs: 1,
    };

    render(
      <ImportWorkspace
        processFile={async () => draft}
        initialBundle={bundle}
        initialDraft={draft}
        onBundleChange={(next) => changes.push(next)}
      />,
    );

    const review = screen.getByRole('button', {
      name: 'Review & Confirm Question 2 text',
    });
    expect(review.closest('.import-field-card-heading')).not.toBeNull();

    await user.click(review);
    const card = review.closest('article');
    expect(card).not.toBeNull();
    const editor = within(card as HTMLElement);
    await user.type(
      editor.getByRole('textbox', { name: 'Confirmed semantic value' }),
      'Second recovered question?',
    );
    await user.click(editor.getByRole('button', { name: 'Confirm semantic value' }));

    expect(changes[changes.length - 1]?.semanticConfirmations).toMatchObject({
      'review-question-text-2': 'Second recovered question?',
    });
  });

});
