import type { SourceEvidence } from '../domain';

export interface ReadingSourcePage {
  documentId: string;
  pageNumber: number;
  text: string;
  evidence: SourceEvidence[];
}

export interface StructureReviewItem {
  id: string;
  critical: boolean;
  reason: string;
  evidence: SourceEvidence[];
}

export interface PassageMarker {
  ordinal: number;
  documentId: string;
  pageNumber: number;
  matchIndex: number;
  evidence: SourceEvidence[];
}

export interface QuestionRangeMarker {
  start: number;
  end: number;
  documentId: string;
  pageNumber: number;
  matchIndex: number;
  sourceText: string;
  evidence: SourceEvidence[];
}

export interface StructuredQuestionGroupDraft {
  id: string;
  range: readonly [number, number];
  pageNumber: number;
  sourceText: string;
  evidence: SourceEvidence[];
}

export interface StructuredReadingSectionDraft {
  id: string;
  ordinal: number;
  title: string;
  passageText: string[];
  questionGroups: StructuredQuestionGroupDraft[];
  evidence: SourceEvidence[];
}

export interface StructuredReadingDraft {
  module: 'READING';
  title: string;
  sections: StructuredReadingSectionDraft[];
  reviewItems: StructureReviewItem[];
}
