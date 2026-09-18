import type {
  ListeningModule,
  ReadingModule,
  StudentModule,
  StudentQuestion,
  StudentTestPackage,
} from './types';

export function questionsForModule(module: StudentModule): StudentQuestion[] {
  if (module.kind === 'READING') {
    return module.sections.flatMap((section) =>
      section.questionGroups.flatMap((group) => group.questions),
    );
  }

  return module.parts.flatMap((part) =>
    part.questionGroups.flatMap((group) => group.questions),
  );
}

export function allQuestionsForTest(test: StudentTestPackage): StudentQuestion[] {
  return test.modules.flatMap(questionsForModule);
}

export function readingModuleFromTest(test: StudentTestPackage): ReadingModule {
  const module = test.modules.find(
    (candidate): candidate is ReadingModule => candidate.kind === 'READING',
  );
  if (!module) {
    throw new Error('Test does not contain a Reading module');
  }
  return module;
}

export function listeningModuleFromTest(test: StudentTestPackage): ListeningModule {
  const module = test.modules.find(
    (candidate): candidate is ListeningModule => candidate.kind === 'LISTENING',
  );
  if (!module) {
    throw new Error('Test does not contain a Listening module');
  }
  return module;
}
