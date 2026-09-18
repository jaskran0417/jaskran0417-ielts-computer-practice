import { describe, expect, it } from 'vitest';
import type {
  DiagramLabelQuestion,
  MatchingQuestion,
  StudentQuestion,
  TableCompletionQuestion,
  TextCompletionQuestion,
  TrueFalseNotGivenQuestion,
} from './types';

function typeOf(question: StudentQuestion): StudentQuestion['type'] {
  return question.type;
}

describe('Reading question schema', () => {
  it('represents the imported Reading interaction types as a discriminated union', () => {
    const tfng: TrueFalseNotGivenQuestion = {
      id: 'q10',
      number: 10,
      type: 'TRUE_FALSE_NOT_GIVEN',
      prompt: 'Sample statement',
    };

    const matching: MatchingQuestion = {
      id: 'q20',
      number: 20,
      type: 'MATCHING_HEADINGS',
      prompt: 'Section A',
      options: [
        { id: 'i', label: 'Heading one' },
        { id: 'ii', label: 'Heading two' },
      ],
      allowOptionReuse: false,
    };

    const completion: TextCompletionQuestion = {
      id: 'q17',
      number: 17,
      type: 'SHORT_ANSWER',
      prompt: 'How long did it take?',
      instructionConstraints: { maxWords: 2, numbersAllowed: true },
    };

    const diagram: DiagramLabelQuestion = {
      id: 'q1',
      number: 1,
      type: 'DIAGRAM_LABEL_COMPLETION',
      prompt: 'Label 1',
      assetId: 'diagram-1',
      anchor: { x: 0.2, y: 0.3, width: 0.1, height: 0.05 },
    };

    const table: TableCompletionQuestion = {
      id: 'q28',
      number: 28,
      type: 'TABLE_COMPLETION',
      prompt: 'Complete the cell',
      tableId: 'table-1',
      cellId: 'cell-28',
      instructionConstraints: { maxWords: 2, numbersAllowed: true },
    };

    expect([tfng, matching, completion, diagram, table].map(typeOf)).toEqual([
      'TRUE_FALSE_NOT_GIVEN',
      'MATCHING_HEADINGS',
      'SHORT_ANSWER',
      'DIAGRAM_LABEL_COMPLETION',
      'TABLE_COMPLETION',
    ]);
  });
});
