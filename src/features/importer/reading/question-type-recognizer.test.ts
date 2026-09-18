import { describe, expect, it } from 'vitest';
import { recognizeQuestionType } from './question-type-recognizer';

describe('recognizeQuestionType', () => {
  const cases = [
    [
      'Questions 1-4 Label the diagram below with the names of the layers of the sun. Choose NO MORE THAN TWO WORDS.',
      'DIAGRAM_LABEL_COMPLETION',
    ],
    [
      'Questions 5-9 Complete each sentence with the correct ending A-I from the box below.',
      'MATCHING_SENTENCE_ENDINGS',
    ],
    [
      'Questions 10-14 Do the following statements agree with the information provided in passage 1? True False Not Given',
      'TRUE_FALSE_NOT_GIVEN',
    ],
    [
      'Questions 15-19 Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage to answer the questions below.',
      'SHORT_ANSWER',
    ],
    [
      'Questions 20-24 Passage 2 has six sections labelled A-F. Choose the correct headings for Sections B-F. List of Headings',
      'MATCHING_HEADINGS',
    ],
    [
      'Questions 25-27 Choose the appropriate letters A, B, C or D. Write your answers in boxes 25-27.',
      'SINGLE_CHOICE',
    ],
    [
      'Questions 28-31 Complete the table below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
      'TABLE_COMPLETION',
    ],
    [
      'Questions 32-36 Passage 3 has six paragraphs labelled A-F. Which paragraphs contain the following information?',
      'MATCHING_INFORMATION',
    ],
    [
      'Questions 37-40 Match each piece of information with the correct person A-E. NB answers A-E can be used more than once.',
      'MATCHING_FEATURES',
    ],
  ] as const;

  it.each(cases)('recognizes %s as %s', (text, expectedType) => {
    expect(recognizeQuestionType(text)).toMatchObject({
      type: expectedType,
      confidence: 'HIGH',
    });
  });

  it('returns a low-confidence conflict instead of guessing when strong rules disagree', () => {
    const result = recognizeQuestionType(
      'Complete the table below. Do the following statements agree? True False Not Given.',
    );

    expect(result).toEqual({
      type: null,
      confidence: 'LOW',
      reasons: ['Conflicting question-type evidence'],
    });
  });
});
