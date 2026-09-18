import type { ImportBundle } from '../bundle/types';

export interface ImportBundleRepository {
  loadBundle(id: string): Promise<ImportBundle | null>;
  listBundles(): Promise<ImportBundle[]>;
  saveBundle(bundle: ImportBundle): Promise<void>;
  deleteBundle(id: string): Promise<void>;
}
