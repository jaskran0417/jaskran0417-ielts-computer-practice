import { describe, expect, it } from 'vitest';
import { recognizeReadingQuestionType } from './question-type-recognizers';

describe('recognizeReadingQuestionType', () => {
  it.each([
    ['Complete the sentences below. ONE WORD ONLY.', '', false, false, 'SENTENCE_COMPLETION'],
    ['Complete the summary using words from the box A-F.', '', false, false, 'SUMMARY_COMPLETION'],
    ['Complete the notes below. NO MORE THAN TWO WORDS.', '', false, false, 'NOTE_COMPLETION'],
    ['Complete the flow-chart below.', '', false, false, 'FLOW_CHART_COMPLETION'],
    ['Choose TWO letters, A-E.', '', false, false, 'MULTI_SELECT'],
    ['Choose THREE correct answers.', '', false, false, 'MULTI_SELECT'],

    [
      'Questions 1-4 Label the diagram below. Choose NO MORE THAN TWO WORDS.',
      '',
      true,
      false,
      'DIAGRAM_LABEL_COMPLETION',
    ],
    [
      'Questions 5-9 Complete each sentence with the correct ending A-I below.',
      'A first ending B second ending',
      false,
      false,
      'MATCHING_SENTENCE_ENDINGS',
    ],
    [
      'Questions 10-14 Do the following statements agree with the information? TRUE FALSE NOT GIVEN',
      '',
      false,
      false,
      'TRUE_FALSE_NOT_GIVEN',
    ],
    [
      'Questions 15-19 Answer the questions below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER.',
      '',
      false,
      false,
      'SHORT_ANSWER',
    ],
    [
      'Questions 20-24 Choose the correct heading for each section from the list of headings below.',
      'List of Headings i ii iii iv',
      false,
      false,
      'MATCHING_HEADINGS',
    ],
    [
      'Questions 25-27 Choose the appropriate letter A, B, C or D.',
      '',
      false,
      false,
      'SINGLE_CHOICE',
    ],
    [
      'Questions 28-31 Complete the table below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER.',
      '',
      false,
      true,
      'TABLE_COMPLETION',
    ],
    [
      'Questions 32-36 Which paragraphs contain the following information? Write the correct letter A-H.',
      '',
      false,
      false,
      'MATCHING_INFORMATION',
    ],
    [
      'Questions 37-40 Match each piece of information with the correct person A-E.',
      '',
      false,
      false,
      'MATCHING_FEATURES',
    ],
  ])(
    'recognizes an IELTS-style Reading question group',
    (instructionText, bodyText, hasDiagram, hasTable, expectedType) => {
      expect(
        recognizeReadingQuestionType({
          instructionText,
          bodyText,
          hasDiagram,
          hasTable,
        }),
      ).toMatchObject({
        type: expectedType,
        confidence: 'HIGH',
      });
    },
  );

  it('does not guess when the instruction is structurally ambiguous', () => {
    expect(
      recognizeReadingQuestionType({
        instructionText: 'Questions 1-5 Answer the questions.',
        bodyText: '',
        hasDiagram: false,
        hasTable: false,
      }),
    ).toEqual({
      type: null,
      confidence: 'LOW',
      reasons: ['No deterministic Reading question-type rule matched'],
    });
  });
});
