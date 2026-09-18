import { render, screen, within } from '@testing-library/react';
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

});
