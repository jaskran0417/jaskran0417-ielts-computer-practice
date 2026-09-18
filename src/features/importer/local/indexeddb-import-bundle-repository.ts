import { openDB, type DBSchema } from 'idb';
import type { ImportBundle } from '../bundle/types';
import type { ImportBundleRepository } from './import-bundle-repository';

interface ImportBundleDatabase extends DBSchema {
  bundles: {
    key: string;
    value: ImportBundle;
    indexes: {
      updatedAtMs: number;
    };
  };
}

export class IndexedDbImportBundleRepository implements ImportBundleRepository {
  constructor(private readonly databaseName = 'ielts-import-bundles') {}

  private open() {
    return openDB<ImportBundleDatabase>(this.databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('bundles')) {
          const store = database.createObjectStore('bundles', { keyPath: 'id' });
          store.createIndex('updatedAtMs', 'updatedAtMs');
        }
      },
    });
  }

  async loadBundle(id: string): Promise<ImportBundle | null> {
    const database = await this.open();
    try {
      return (await database.get('bundles', id)) ?? null;
    } finally {
      database.close();
    }
  }

  async saveBundle(bundle: ImportBundle): Promise<void> {
    const database = await this.open();
    try {
      await database.put('bundles', bundle);
    } finally {
      database.close();
    }
  }

  async deleteBundle(id: string): Promise<void> {
    const database = await this.open();
    try {
      await database.delete('bundles', id);
    } finally {
      database.close();
    }
  }

  async listBundles(): Promise<ImportBundle[]> {
    const database = await this.open();
    try {
      const bundles = await database.getAll('bundles');
      return bundles.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
    } finally {
      database.close();
    }
  }
}
