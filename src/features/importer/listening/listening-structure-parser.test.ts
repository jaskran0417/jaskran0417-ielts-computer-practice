import { describe, expect, it } from 'vitest';
import { buildStructuredListeningDraft } from './listening-structure-parser';
import type { ListeningSourceBlock } from './types';
import type { ImportedVisualRegion } from '../reading/types';

function block(pageNumber: number, text: string): ListeningSourceBlock {
  return {
    pageNumber,
    text,
    evidence: [{
      documentId: 'listening-paper',
      pageNumber,
      method: 'PDF_TEXT',
    }],
  };
}

const blocks: ListeningSourceBlock[] = [
  block(1, [
    'Part 1',
    'Questions 1-5',
    'Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.',
    '1 Full name',
    '2 Arrival date',
    '3 Number of guests',
    '4 Room type',
    '5 Email address',
    'Questions 6-10',
    'Choose the correct letter, A, B or C.',
    '6 Which location does the caller prefer?',
    'A. Park',
    'B. Museum',
    'C. Library',
    '7 Which day is available?',
    'A. Monday',
    'B. Tuesday',
    'C. Wednesday',
    '8 Which transport is suggested?',
    'A. Bus',
    'B. Train',
    'C. Taxi',
    '9 Which meal is included?',
    'A. Breakfast',
    'B. Lunch',
    'C. Dinner',
    '10 Which document is required?',
    'A. Passport',
    'B. Ticket',
    'C. Receipt',
  ].join('\n')),
  block(2, [
    'Part 2',
    'Questions 11-15',
    'Label the map below. Choose ONE WORD ONLY from the recording for each answer.',
    '11 Main entrance',
    '12 Reception',
    '13 Cafe',
    '14 Garden',
    '15 Exit',
    'Questions 16-20',
    'Match each facility with the correct location A-E.',
    '16 Sports centre',
    '17 Library',
    '18 Clinic',
    '19 Cafe',
    '20 Shop',
    'A. North side',
    'B. East side',
    'C. South side',
    'D. West side',
    'E. Central area',
  ].join('\n')),
  block(3, [
    'Part 3',
    'Questions 21-25',
    'Choose the correct letter, A, B or C.',
    '21 What is the main research topic?',
    'A. Housing',
    'B. Transport',
    'C. Education',
    '22 What method will be used?',
    'A. Interviews',
    'B. Surveys',
    'C. Observation',
    '23 Who will collect the data?',
    'A. Students',
    'B. Tutors',
    'C. Staff',
    '24 When is the deadline?',
    'A. Monday',
    'B. Friday',
    'C. Sunday',
    '25 Where will they meet?',
    'A. Lab',
    'B. Library',
    'C. Cafe',
    'Questions 26-30',
    'Match each speaker with the correct opinion A-E.',
    '26 Speaker one',
    '27 Speaker two',
    '28 Speaker three',
    '29 Speaker four',
    '30 Speaker five',
    'A. Too expensive',
    'B. Very useful',
    'C. Difficult to organise',
    'D. Needs more evidence',
    'E. Ready to publish',
  ].join('\n')),
  block(4, [
    'Part 4',
    'Questions 31-35',
    'Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.',
    '31 The first stage uses',
    '32 The second stage measures',
    '33 The sample is stored in',
    '34 The final result depends on',
    '35 The report is sent to',
    'Questions 36-40',
    'Answer the questions below. Write NO MORE THAN TWO WORDS for each answer.',
    '36 What is the first limitation?',
    '37 Which group was excluded?',
    '38 What caused the delay?',
    '39 Where was the study repeated?',
    '40 What is recommended next?',
  ].join('\n')),
];

const visualRegions: ImportedVisualRegion[] = [{
  id: 'map-page-2',
  sourceDocumentId: 'listening-paper',
  pageNumber: 2,
  kind: 'DIAGRAM',
  crop: { x: 0.1, y: 0.2, width: 0.8, height: 0.5 },
}];

describe('Listening structure parser', () => {
  it('structures four parts and forty ordered questions from explicit part/range headings', () => {
    const draft = buildStructuredListeningDraft({ blocks, visualRegions });
    const questions = draft.parts.flatMap((part) =>
      part.questionGroups.flatMap((group) => group.questions),
    );

    expect(draft.reviewItems).toEqual([]);
    expect(draft.parts.map((part) => part.partNumber)).toEqual([1, 2, 3, 4]);
    expect(questions).toHaveLength(40);
    expect(questions.map((question) => question.number))
      .toEqual(Array.from({ length: 40 }, (_, index) => index + 1));

    expect(questions.find((question) => question.number === 1)?.type)
      .toBe('FORM_COMPLETION');
    expect(questions.find((question) => question.number === 6)?.type)
      .toBe('SINGLE_CHOICE');
    expect(questions.find((question) => question.number === 11)?.type)
      .toBe('DIAGRAM_LABEL_COMPLETION');
    expect(questions.find((question) => question.number === 16)?.type)
      .toBe('MATCHING_FEATURES');
    expect(questions.find((question) => question.number === 31)?.type)
      .toBe('SENTENCE_COMPLETION');
    expect(questions.find((question) => question.number === 36)?.type)
      .toBe('SHORT_ANSWER');

    expect(questions.find((question) => question.number === 6)?.options)
      .toHaveLength(3);
    expect(questions.find((question) => question.number === 16)?.options)
      .toHaveLength(5);
    expect(questions.find((question) => question.number === 11)?.visualRegionId)
      .toBe('map-page-2');
  });

  it('reports discontinuous or missing part structure instead of inventing it', () => {
    const draft = buildStructuredListeningDraft({
      blocks: [blocks[0]!, blocks[2]!],
      visualRegions: [],
    });

    expect(draft.reviewItems.some((item) =>
      item.kind === 'DOCUMENT_STRUCTURE' &&
      /part/i.test(item.message),
    )).toBe(true);
  });
});
