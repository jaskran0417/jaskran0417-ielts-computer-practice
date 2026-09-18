import { describe, expect, it } from 'vitest';
import { recognizeListeningQuestionType } from './listening-question-type-recognizers';

describe('Listening question type recognition', () => {
  it.each([
    ['Choose the correct letter, A, B or C.', false, false, 'SINGLE_CHOICE'],
    ['Choose TWO letters, A-E.', false, false, 'MULTI_SELECT'],
    ['Match each speaker with the correct option A-E.', false, false, 'MATCHING_FEATURES'],
    ['Label the map below. Choose NO MORE THAN TWO WORDS.', true, false, 'DIAGRAM_LABEL_COMPLETION'],
    ['Complete the table below. Write ONE WORD ONLY.', false, true, 'TABLE_COMPLETION'],
    ['Complete the form below. Write ONE WORD AND/OR A NUMBER.', false, false, 'FORM_COMPLETION'],
    ['Complete the notes below. Write NO MORE THAN TWO WORDS.', false, false, 'NOTE_COMPLETION'],
    ['Complete the flow-chart below. Write ONE WORD ONLY.', false, false, 'FLOW_CHART_COMPLETION'],
    ['Complete the sentences below. Write NO MORE THAN TWO WORDS.', false, false, 'SENTENCE_COMPLETION'],
    ['Answer the questions below. Write NO MORE THAN TWO WORDS.', false, false, 'SHORT_ANSWER'],
  ] as const)(
    'recognizes %s',
    (instructionText, hasDiagram, hasTable, expected) => {
      expect(
        recognizeListeningQuestionType({
          instructionText,
          bodyText: instructionText,
          hasDiagram,
          hasTable,
        }).type,
      ).toBe(expected);
    },
  );
});
