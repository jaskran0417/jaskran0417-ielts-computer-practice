import type { StudentTestPackage } from '../test-schema/types';
import {
  summarizeStudentTest,
  type TestCatalogRepository,
  type TestSummary,
} from './test-catalog-repository';

interface QueryError {
  message: string;
}

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

interface SupabaseQueryChain {
  select(columns: string): SupabaseQueryChain;
  eq(column: string, value: unknown): SupabaseQueryChain;
  not(column: string, operator: string, value: unknown): SupabaseQueryChain;
  order?(
    column: string,
    options?: { ascending?: boolean },
  ): Promise<QueryResult<unknown[]>>;
  maybeSingle?(): Promise<QueryResult<unknown>>;
}

export interface SupabaseCatalogClient {
  from(table: string): SupabaseQueryChain;
}

interface VersionRow {
  id: string;
  test_id: string;
  version_number?: number;
  published_at: string | null;
  content: StudentTestPackage;
  tests: {
    id?: string;
    title?: string;
    status: string;
  } | null;
}

function isStudentTestPackage(value: unknown): value is StudentTestPackage {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.versionId === 'string' &&
    typeof row.title === 'string' &&
    typeof row.durationSeconds === 'number' &&
    Array.isArray(row.modules)
  );
}

function parseVersionRow(value: unknown): VersionRow | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const tests = row.tests;

  if (
    typeof row.id !== 'string' ||
    typeof row.test_id !== 'string' ||
    (row.published_at !== null && typeof row.published_at !== 'string') ||
    !isStudentTestPackage(row.content) ||
    !tests ||
    typeof tests !== 'object'
  ) {
    return null;
  }

  const testRow = tests as Record<string, unknown>;
  if (typeof testRow.status !== 'string') return null;

  return {
    id: row.id,
    test_id: row.test_id,
    version_number:
      typeof row.version_number === 'number' ? row.version_number : undefined,
    published_at: row.published_at as string | null,
    content: row.content,
    tests: {
      id: typeof testRow.id === 'string' ? testRow.id : undefined,
      title: typeof testRow.title === 'string' ? testRow.title : undefined,
      status: testRow.status,
    },
  };
}

function publishedRow(value: unknown): VersionRow | null {
  const row = parseVersionRow(value);
  if (!row || !row.published_at || row.tests?.status !== 'published') {
    return null;
  }

  return row;
}

export class SupabaseTestCatalog implements TestCatalogRepository {
  constructor(private readonly client: SupabaseCatalogClient) {}

  async listPublishedTests(): Promise<TestSummary[]> {
    const query = this.client
      .from('test_versions')
      .select(
        'id,test_id,version_number,published_at,content,tests!inner(id,title,status)',
      )
      .not('published_at', 'is', null)
      .eq('tests.status', 'published');

    if (!query.order) {
      throw new Error('Supabase catalog query does not support ordering');
    }

    const { data, error } = await query.order('version_number', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Unable to list published tests: ${error.message}`);
    }

    const newestByTest = new Map<string, VersionRow>();
    for (const value of data ?? []) {
      const row = publishedRow(value);
      if (!row || newestByTest.has(row.test_id)) continue;
      newestByTest.set(row.test_id, row);
    }

    return [...newestByTest.values()].map((row) => {
      const summary = summarizeStudentTest(row.content);
      return {
        ...summary,
        testId: row.test_id,
        versionId: row.id,
        title: row.tests?.title ?? summary.title,
      };
    });
  }

  async loadPublishedTest(
    testId: string,
    versionId: string,
  ): Promise<StudentTestPackage> {
    const query = this.client
      .from('test_versions')
      .select(
        'id,test_id,published_at,content,tests!inner(status)',
      )
      .eq('id', versionId)
      .eq('test_id', testId)
      .not('published_at', 'is', null)
      .eq('tests.status', 'published');

    if (!query.maybeSingle) {
      throw new Error('Supabase catalog query does not support maybeSingle');
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Unable to load published test: ${error.message}`);
    }

    const row = publishedRow(data);
    if (!row || row.id !== versionId || row.test_id !== testId) {
      throw new Error('Published test version not found');
    }

    return row.content;
  }

  async saveLocalTest(): Promise<void> {
    throw new Error('Supabase catalog cannot save a local test copy');
  }
}
