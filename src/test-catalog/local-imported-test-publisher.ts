import type { PreparedReadingPublication } from '../features/importer/publication/import-publication';
import type { ProtectedAnswerRepository } from '../scoring/indexeddb-protected-answer-repository';
import type { TestCatalogRepository } from './test-catalog-repository';

export interface LocalImportedTestPublishResult {
  testId: string;
  versionId: string;
}

export class LocalImportedTestPublisher {
  constructor(
    private readonly catalog: TestCatalogRepository,
    private readonly protectedAnswers: ProtectedAnswerRepository,
  ) {}

  async publish(
    input: PreparedReadingPublication,
  ): Promise<LocalImportedTestPublishResult> {
    await this.catalog.saveLocalTest(input.studentPackage);
    await this.protectedAnswers.save(
      input.studentPackage.versionId,
      input.protectedAnswers,
    );

    return {
      testId: input.studentPackage.id,
      versionId: input.studentPackage.versionId,
    };
  }
}
