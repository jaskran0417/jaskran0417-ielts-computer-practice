import { openDB, type DBSchema } from 'idb';
import type { StudentTestPackage } from '../test-schema/types';
import {
  summarizeStudentTest,
  type TestCatalogRepository,
  type TestSummary,
} from './test-catalog-repository';

interface StoredTest {
  key: string;
  test: StudentTestPackage;
}

interface TestCatalogDatabase extends DBSchema {
  tests: {
    key: string;
    value: StoredTest;
  };
}

function storageKey(testId: string, versionId: string): string {
  return `${testId}:${versionId}`;
}

export class IndexedDbTestCatalog implements TestCatalogRepository {
  constructor(private readonly databaseName = 'ielts-test-catalog') {}

  private open() {
    return openDB<TestCatalogDatabase>(this.databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('tests')) {
          database.createObjectStore('tests', { keyPath: 'key' });
        }
      },
    });
  }

  async saveLocalTest(test: StudentTestPackage): Promise<void> {
    const database = await this.open();
    try {
      await database.put('tests', {
        key: storageKey(test.id, test.versionId),
        test,
      });
    } finally {
      database.close();
    }
  }

  async loadPublishedTest(
    testId: string,
    versionId: string,
  ): Promise<StudentTestPackage> {
    const database = await this.open();
    try {
      const stored = await database.get(
        'tests',
        storageKey(testId, versionId),
      );

      if (
        !stored ||
        stored.test.id !== testId ||
        stored.test.versionId !== versionId
      ) {
        throw new Error('Published test version not found');
      }

      return stored.test;
    } finally {
      database.close();
    }
  }

  async listPublishedTests(): Promise<TestSummary[]> {
    const database = await this.open();
    try {
      const stored = await database.getAll('tests');
      return stored.map(({ test }) => summarizeStudentTest(test));
    } finally {
      database.close();
    }
  }
}
