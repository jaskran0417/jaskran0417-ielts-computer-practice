import type { StudentTestPackage } from '../test-schema/types';

export type TestCatalogModule = 'READING' | 'LISTENING' | 'WRITING';

export interface TestSummary {
  testId: string;
  versionId: string;
  title: string;
  modules: TestCatalogModule[];
}

export interface TestCatalogRepository {
  listPublishedTests(): Promise<TestSummary[]>;
  loadPublishedTest(
    testId: string,
    versionId: string,
  ): Promise<StudentTestPackage>;
  saveLocalTest(test: StudentTestPackage): Promise<void>;
}

const MODULES = new Set<TestCatalogModule>([
  'READING',
  'LISTENING',
  'WRITING',
]);

export function summarizeStudentTest(test: StudentTestPackage): TestSummary {
  const modules = test.modules
    .map((module) => module.kind)
    .filter((kind): kind is TestCatalogModule =>
      MODULES.has(kind as TestCatalogModule),
    );

  return {
    testId: test.id,
    versionId: test.versionId,
    title: test.title,
    modules: [...new Set(modules)],
  };
}
