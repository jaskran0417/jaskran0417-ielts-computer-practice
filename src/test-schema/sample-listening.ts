import type {
  ListeningModule,
  StudentQuestion,
  StudentTestPackage,
} from './types';

function questions(start: number): StudentQuestion[] {
  return Array.from({ length: 10 }, (_, index) => {
    const number = start + index;
    return {
      id: `lq-${number}`,
      number,
      type: 'SHORT_ANSWER' as const,
      prompt: `Listening practice question ${number}`,
      placeholder: 'Type your answer',
    };
  });
}

const listeningModule: ListeningModule = {
  id: 'listening',
  kind: 'LISTENING',
  title: 'Listening',
  parts: Array.from({ length: 4 }, (_, index) => {
    const partNumber = index + 1;
    const start = index * 10 + 1;
    return {
      id: `listening-part-${partNumber}`,
      partNumber,
      title: `Part ${partNumber}`,
      audioAssetId: `listening-audio-${partNumber}`,
      questionGroups: [{
        id: `listening-group-${partNumber}`,
        instruction: 'Listen and answer Questions ' + start + '-' + (start + 9) + '.',
        questions: questions(start),
      }],
    };
  }),
};

export const sampleListeningTest: StudentTestPackage = {
  id: 'listening-demo',
  versionId: 'listening-demo-v1',
  title: 'Listening Practice',
  durationSeconds: 30 * 60,
  modules: [listeningModule],
  assets: listeningModule.parts.map((part) => ({
    id: part.audioAssetId,
    url: `/fixtures/${part.audioAssetId}.mp3`,
    alt: `${part.title} recording`,
    kind: 'AUDIO',
  })),
};
