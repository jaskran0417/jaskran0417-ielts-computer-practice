import type { ImportBundle } from '../bundle/domain';
import type { NormalizedRect, VerificationResult } from '../domain';

export type SourceDocumentKind = 'PDF' | 'IMAGE' | 'ANSWER_KEY' | 'AUDIO' | 'OTHER';

export interface SourceDocumentRecord {
  id: string;
  name: string;
  mediaType: string;
  sizeBytes: number;
  kind: SourceDocumentKind;
  createdAtMs: number;
  /** Original local source bytes retained for offline evidence review and refresh recovery. */
  sourceBytes?: ArrayBuffer;
}

export type ImportFieldKind =
  | 'QUESTION_TEXT'
  | 'INSTRUCTION'
  | 'PASSAGE_TEXT'
  | 'ANSWER'
  | 'OPTION'
  | 'OTHER';

export interface ImportFieldRecord {
  id: string;
  kind: ImportFieldKind;
  critical: boolean;
  verification: VerificationResult;
  confirmedValue?: string;
  /** Present only when this field was re-extracted from an explicit source crop. */
  sourceRegion?: NormalizedRect;
}

export interface ImportVisualAssetRecord {
  id: string;
  sourceDocumentId: string;
  pageNumber: number;
  kind: 'DIAGRAM' | 'TABLE';
  mediaType: string;
  dataUrl: string;
  crop: NormalizedRect;
}

export interface ImportDraft {
  id: string;
  testId: string;
  sourceDocuments: SourceDocumentRecord[];
  fields: ImportFieldRecord[];
  visualAssets?: ImportVisualAssetRecord[];
  updatedAtMs: number;
}

export interface ImportRepository {
  loadDraft(id: string): Promise<ImportDraft | null>;
  saveDraft(draft: ImportDraft): Promise<void>;
  deleteDraft(id: string): Promise<void>;
  listDrafts(): Promise<ImportDraft[]>;
  loadBundle(id: string): Promise<ImportBundle | null>;
  saveBundle(bundle: ImportBundle): Promise<void>;
  deleteBundle(id: string): Promise<void>;
  listBundles(): Promise<ImportBundle[]>;
}
