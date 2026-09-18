import { openDB, type DBSchema } from 'idb';
import type { ImportBundle } from '../bundle/domain';
import type { ImportDraft, ImportRepository } from './import-repository';

interface ImportDraftDatabase extends DBSchema {
  importDrafts: {
    key: string;
    value: ImportDraft;
  };
  importBundles: {
    key: string;
    value: ImportBundle;
  };
}

export class IndexedDbImportRepository implements ImportRepository {
  constructor(private readonly databaseName = 'ielts-import-drafts') {}

  private open() {
    return openDB<ImportDraftDatabase>(this.databaseName, 2, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('importDrafts')) {
          database.createObjectStore('importDrafts', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('importBundles')) {
          database.createObjectStore('importBundles', { keyPath: 'id' });
        }
      },
    });
  }

  async loadDraft(id: string): Promise<ImportDraft | null> {
    const database = await this.open();
    try {
      return (await database.get('importDrafts', id)) ?? null;
    } finally {
      database.close();
    }
  }

  async saveDraft(draft: ImportDraft): Promise<void> {
    const database = await this.open();
    try {
      await database.put('importDrafts', draft);
    } finally {
      database.close();
    }
  }

  async deleteDraft(id: string): Promise<void> {
    const database = await this.open();
    try {
      await database.delete('importDrafts', id);
    } finally {
      database.close();
    }
  }

  async listDrafts(): Promise<ImportDraft[]> {
    const database = await this.open();
    try {
      const drafts = await database.getAll('importDrafts');
      return drafts.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
    } finally {
      database.close();
    }
  }

  async loadBundle(id: string): Promise<ImportBundle | null> {
    const database = await this.open();
    try {
      return (await database.get('importBundles', id)) ?? null;
    } finally {
      database.close();
    }
  }

  async saveBundle(bundle: ImportBundle): Promise<void> {
    const database = await this.open();
    try {
      await database.put('importBundles', bundle);
    } finally {
      database.close();
    }
  }

  async deleteBundle(id: string): Promise<void> {
    const database = await this.open();
    try {
      await database.delete('importBundles', id);
    } finally {
      database.close();
    }
  }

  async listBundles(): Promise<ImportBundle[]> {
    const database = await this.open();
    try {
      const bundles = await database.getAll('importBundles');
      return bundles.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
    } finally {
      database.close();
    }
  }
}
