import { openDB, type DBSchema } from 'idb';
import type { ImportDraft, ImportRepository } from './import-repository';

interface ImportDraftDatabase extends DBSchema {
  importDrafts: {
    key: string;
    value: ImportDraft;
  };
}

export class IndexedDbImportRepository implements ImportRepository {
  constructor(private readonly databaseName = 'ielts-import-drafts') {}

  private open() {
    return openDB<ImportDraftDatabase>(this.databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('importDrafts')) {
          database.createObjectStore('importDrafts', { keyPath: 'id' });
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
}
