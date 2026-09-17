import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportDraft } from './local/import-repository';
import { ImportWorkspace } from './ImportWorkspace';

function importedDraft(): ImportDraft {
  return {
    id: 'draft-1',
    testId: 'test-1',
    sourceDocuments: [
      {
        id: 'doc-1',
        name: 'practice-reading.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 2048,
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
          normalizedValue: 'Choose the correct answer.',
          reasons: [],
          passA: {
            value: 'Choose the correct answer.',
            confidence: 100,
            evidence: { documentId: 'doc-1', pageNumber: 1, method: 'PDF_TEXT' },
          },
          passB: {
            value: 'Choose the correct answer.',
            confidence: 100,
            evidence: { documentId: 'doc-1', pageNumber: 1, method: 'PDF_TEXT' },
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
            value: 'The library opens at 8.',
            confidence: 91,
            evidence: { documentId: 'doc-1', pageNumber: 2, method: 'OCR_A' },
          },
          passB: {
            value: 'The library opens at 9.',
            confidence: 88,
            evidence: { documentId: 'doc-1', pageNumber: 2, method: 'OCR_B' },
          },
        },
      },
      {
        id: 'question-2',
        kind: 'QUESTION_TEXT',
        critical: true,
        verification: {
          state: 'REVIEW_REQUIRED',
          normalizedValue: null,
          reasons: ['Independent extraction passes disagree'],
        },
      },
    ],
    updatedAtMs: 2_000,
  };
}

describe('ImportWorkspace', () => {
  it('imports a local source, exposes verification evidence, and keeps publishing blocked until every critical conflict is resolved', async () => {
    const user = userEvent.setup();
    const processFile = vi.fn(async () => importedDraft());

    render(<ImportWorkspace processFile={processFile} />);

    const file = new File(['pdf'], 'practice-reading.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Choose source file'), file);

    expect(processFile).toHaveBeenCalledWith(file);
    expect(await screen.findByText('practice-reading.pdf')).toBeInTheDocument();
    expect(screen.getByText('Choose the correct answer.')).toBeInTheDocument();

    const verifiedRow = screen.getByTestId('import-field-instruction-1');
    expect(within(verifiedRow).getByText('VERIFIED')).toBeInTheDocument();

    const conflictRow = screen.getByTestId('import-field-question-1');
    expect(within(conflictRow).getByText('REVIEW_REQUIRED')).toBeInTheDocument();
    await user.click(within(conflictRow).getByRole('button', { name: 'Review question-1' }));

    expect(screen.getByRole('heading', { name: 'Source evidence' })).toBeInTheDocument();
    expect(screen.getAllByText('Page 2')).toHaveLength(2);
    expect(screen.getByText('OCR A')).toBeInTheDocument();
    expect(screen.getByText('OCR B')).toBeInTheDocument();
    expect(screen.getByText('The library opens at 8.')).toBeInTheDocument();
    expect(screen.getByText('The library opens at 9.')).toBeInTheDocument();

    const editor = screen.getByRole('textbox', { name: 'Confirmed field value' });
    await user.clear(editor);
    await user.type(editor, 'The library opens at 8.');
    await user.click(screen.getByRole('button', { name: 'Confirm field' }));

    expect(within(screen.getByTestId('import-field-question-1')).getByText('CONFIRMED')).toBeInTheDocument();
    expect(screen.getByText('1 critical field still needs review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish imported test' })).toBeDisabled();
  });
});
