import type { StudentTestPackage } from './types';

export const sampleReadingTest: StudentTestPackage = {
  id: 'reading-demo',
  versionId: 'reading-demo-v1',
  title: 'Academic Reading Practice',
  durationSeconds: 60 * 60,
  modules: [
    {
      id: 'reading',
      kind: 'READING',
      title: 'Reading',
      sections: [
        {
          id: 'section-1',
          title: 'Passage 1',
          passage: {
            id: 'passage-1',
            title: 'Urban green spaces',
            paragraphs: [
              'Cities around the world are reconsidering the role of parks, street trees and smaller planted areas in everyday urban life.',
              'Researchers have examined how access, design and maintenance can influence the way residents use shared outdoor spaces.',
              'The passage in this development fixture is original placeholder material. Production tests will be imported through the verified content pipeline.',
            ],
          },
          questionGroups: [
            {
              id: 'group-1',
              instruction: 'Choose the correct answer, A, B or C.',
              questions: [
                {
                  id: 'q1',
                  number: 1,
                  type: 'SINGLE_CHOICE',
                  prompt: 'Which place is used here as a sample answer option?',
                  options: [
                    { id: 'A', label: 'British Museum' },
                    { id: 'B', label: 'Central Station' },
                    { id: 'C', label: 'River Market' },
                  ],
                },
                {
                  id: 'q2',
                  number: 2,
                  type: 'GAP_FILL',
                  prompt: 'Complete the note with one word from the passage.',
                  placeholder: 'Type your answer',
                },
              ],
            },
            {
              id: 'group-2',
              instruction: 'Answer the following questions.',
              questions: [
                {
                  id: 'q3',
                  number: 3,
                  type: 'SINGLE_CHOICE',
                  prompt: 'Which topic is explicitly mentioned in the passage?',
                  options: [
                    { id: 'A', label: 'Street trees' },
                    { id: 'B', label: 'Airport design' },
                    { id: 'C', label: 'Ocean shipping' },
                  ],
                },
                {
                  id: 'q4',
                  number: 4,
                  type: 'GAP_FILL',
                  prompt: 'Enter one word to complete this practice field.',
                  placeholder: 'One word',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
