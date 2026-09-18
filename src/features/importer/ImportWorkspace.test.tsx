import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
});
