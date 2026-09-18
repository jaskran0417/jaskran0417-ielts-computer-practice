import type { NormalizedRect } from '../domain';
import type { SourceDocumentRecord } from '../local/import-repository';
import type { ObjectiveScoringMode } from '../../../test-schema/types';

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
  sourceDocumentId: string;
  role: ImportSourceRole;
  pageRanges?: PageRange[];
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
  module: ImportModule;
  title: string;
  sourceDocuments: SourceDocumentRecord[];
  assignments: ImportSourceAssignment[];
  scoringMode?: ObjectiveScoringMode;
  semanticConfirmations?: Record<string, string>;
  visualAnchorConfirmations?: Record<string, NormalizedRect>;
  status: ImportBundleStatus;
  updatedAtMs: number;
}
