import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StudentQuestion } from '../test-schema/types';
import { renderStudentQuestion } from './question-renderer-registry';

function questionFixture(type: StudentQuestion['type']): StudentQuestion {
  const base = { id: `q-${type}`, number: 1, prompt: 'Prompt' };

  switch (type) {
    case 'SINGLE_CHOICE':
      return { ...base, type, options: [{ id: 'A', label: 'Alpha' }] };
    case 'MULTI_SELECT':
      return {
        ...base,
        type,
        options: [
          { id: 'A', label: 'Alpha' },
          { id: 'B', label: 'Beta' },
        ],
      };
    case 'TRUE_FALSE_NOT_GIVEN':
    case 'YES_NO_NOT_GIVEN':
      return { ...base, type };
    case 'MATCHING_INFORMATION':
    case 'MATCHING_HEADINGS':
    case 'MATCHING_FEATURES':
    case 'MATCHING_SENTENCE_ENDINGS':
      return {
        ...base,
        type,
        options: [
          { id: 'A', label: 'Alpha' },
          { id: 'B', label: 'Beta' },
        ],
      };
    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'TABLE_COMPLETION':
    case 'FLOW_CHART_COMPLETION':
      return { ...base, type, placeholder: 'Type answer' };
    case 'DIAGRAM_LABEL_COMPLETION':
      return { ...base, type, assetId: 'diagram-1' };
    case 'GAP_FILL':
      return { ...base, type, placeholder: 'Type answer' };
  }
}

describe('question renderer registry', () => {
  it.each([
    'TRUE_FALSE_NOT_GIVEN',
    'YES_NO_NOT_GIVEN',
    'MATCHING_INFORMATION',
    'MATCHING_HEADINGS',
    'MATCHING_FEATURES',
    'MATCHING_SENTENCE_ENDINGS',
    'SHORT_ANSWER',
    'TABLE_COMPLETION',
    'DIAGRAM_LABEL_COMPLETION',
    'MULTI_SELECT',
  ] as const)('renders %s without falling back to another type', (type) => {
    render(<>{renderStudentQuestion(questionFixture(type), undefined, vi.fn())}</>);

    expect(screen.getByTestId(`question-type-${type}`)).toBeInTheDocument();
  });
});
