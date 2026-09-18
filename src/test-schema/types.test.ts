import { describe, expect, it } from 'vitest';
import type {
  DiagramLabelQuestion,
  ListeningModule,
  MatchingQuestion,
  StudentQuestion,
  StudentTestPackage,
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
      assetId: 'table-asset-1',
      anchor: { x: 0.1, y: 0.2, width: 0.2, height: 0.08 },
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


describe('Listening module schema', () => {
  it('represents four Listening parts with audio assets and questions 1-40', () => {
    const parts = Array.from({ length: 4 }, (_, partIndex) => {
      const start = partIndex * 10 + 1;
      const questions: StudentQuestion[] = Array.from({ length: 10 }, (_, index) => ({
        id: `lq-${start + index}`,
        number: start + index,
        type: 'SHORT_ANSWER' as const,
        prompt: `Listening question ${start + index}`,
      }));

      return {
        id: `listening-part-${partIndex + 1}`,
        partNumber: partIndex + 1,
        title: `Part ${partIndex + 1}`,
        audioAssetId: `audio-part-${partIndex + 1}`,
        questionGroups: [{
          id: `listening-group-${partIndex + 1}`,
          instruction: 'Answer the questions.',
          questions,
        }],
      };
    });

    const listening: ListeningModule = {
      id: 'listening-module',
      kind: 'LISTENING',
      title: 'Listening',
      parts,
    };

    const test: StudentTestPackage = {
      id: 'listening-test',
      versionId: 'listening-version-1',
      title: 'Listening Test',
      durationSeconds: 30 * 60,
      modules: [listening],
      assets: parts.map((part) => ({
        id: part.audioAssetId,
        url: `/audio/${part.audioAssetId}.mp3`,
        alt: `${part.title} recording`,
        kind: 'AUDIO' as const,
      })),
    };

    expect(test.modules[0].kind).toBe('LISTENING');
    expect(listening.parts).toHaveLength(4);
    expect(listening.parts.flatMap((part) =>
      part.questionGroups.flatMap((group) => group.questions),
    )).toHaveLength(40);
  });
});
