import type { VerificationResult } from '../domain';

export type SourceDocumentKind = 'PDF' | 'IMAGE' | 'ANSWER_KEY' | 'AUDIO' | 'OTHER';

export interface SourceDocumentRecord {
  id: string;
  name: string;
  mediaType: string;
  sizeBytes: number;
  kind: SourceDocumentKind;
  createdAtMs: number;
  /** Original local source bytes retained for offline evidence review and refresh recovery. */
  sourceBlob?: Blob;
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
}

export interface ImportDraft {
  id: string;
  testId: string;
  sourceDocuments: SourceDocumentRecord[];
  fields: ImportFieldRecord[];
  updatedAtMs: number;
}

export interface ImportRepository {
  loadDraft(id: string): Promise<ImportDraft | null>;
  saveDraft(draft: ImportDraft): Promise<void>;
  deleteDraft(id: string): Promise<void>;
  listDrafts(): Promise<ImportDraft[]>;
}
