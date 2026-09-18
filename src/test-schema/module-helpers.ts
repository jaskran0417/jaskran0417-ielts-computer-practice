import type {
  ListeningModule,
  ReadingModule,
  StudentModule,
  StudentTestPackage,
} from './types';

function moduleFromTest<T extends StudentModule['kind']>(
  test: StudentTestPackage,
  kind: T,
): Extract<StudentModule, { kind: T }> {
  const module = test.modules.find(
    (candidate): candidate is Extract<StudentModule, { kind: T }> =>
      candidate.kind === kind,
  );

  if (!module) {
    const label = kind[0] + kind.slice(1).toLowerCase();
    throw new Error(`${label} module is not present in this test`);
  }

  return module;
}

export function readingModuleFromTest(test: StudentTestPackage): ReadingModule {
  return moduleFromTest(test, 'READING');
}

export function listeningModuleFromTest(
  test: StudentTestPackage,
): ListeningModule {
  return moduleFromTest(test, 'LISTENING');
}

export function questionGroupsForModule(module: StudentModule) {
  return module.sections.flatMap((section) => section.questionGroups);
}
