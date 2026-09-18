import type { SourceDocumentRecord } from '../local/import-repository';
import type { StructuredReadingDraft } from '../reading/reading-structure';

export type ImportModule = 'READING' | 'LISTENING' | 'WRITING';

export type ImportSourceRole =
  | 'QUESTION_MATERIAL'
  | 'ANSWER_KEY'
  | 'AUDIO'
  | 'WRITING_PROMPT'
  | 'STAFF_MARKING_GUIDE'
  | 'SUPPORTING_EVIDENCE';

export interface PageRange {
  startPage: number;
  endPage: number;
}

export interface ImportSourceAssignment {
  id: string;
  documentId: string;
  role: ImportSourceRole;
  pageRanges: PageRange[];
  requiredForPublication: boolean;
}

export type ImportBundleStatus =
  | 'COLLECTING_SOURCES'
  | 'EXTRACTING'
  | 'STRUCTURING'
  | 'REVIEW_REQUIRED'
  | 'READY_TO_PREVIEW'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED';

export interface ImportBundle {
  id: string;
  testId: string;
  module: ImportModule;
  title: string;
  sourceDocuments: SourceDocumentRecord[];
  assignments: ImportSourceAssignment[];
  structuredDraft: StructuredReadingDraft | null;
  status: ImportBundleStatus;
  updatedAtMs: number;
}
