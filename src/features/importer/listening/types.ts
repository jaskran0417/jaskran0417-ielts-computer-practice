import type { SourceEvidence } from '../domain';
import type {
  ImportedVisualRegion,
  ReadingQuestionDraft,
  ReadingQuestionGroupDraft,
  StructureReviewItem,
} from '../reading/types';

export interface ListeningSourceBlock {
  pageNumber: number;
  text: string;
  evidence: SourceEvidence[];
}

export interface ListeningPartDraft {
  id: string;
  partNumber: number;
  title: string;
  pageNumbers: number[];
  questionGroups: ReadingQuestionGroupDraft[];
  evidence: SourceEvidence[];
  audioSourceDocumentId?: string;
}

export interface StructuredListeningDraft {
  title: string;
  parts: ListeningPartDraft[];
  reviewItems: StructureReviewItem[];
}

export type ListeningQuestionDraft = ReadingQuestionDraft;
export type ListeningVisualRegion = ImportedVisualRegion;
