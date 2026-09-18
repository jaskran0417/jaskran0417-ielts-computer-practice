import type { SourceEvidence } from '../domain';

export interface ReadingSourceBlock {
  pageNumber: number;
  text: string;
  evidence: SourceEvidence[];
}

export interface PassageOutline {
  passageNumber: number;
  title: string | null;
  pageNumbers: number[];
  evidence: SourceEvidence[];
}

export interface QuestionRangeOutline {
  start: number;
  end: number;
  pageNumbers: number[];
  instructionText: string;
  evidence: SourceEvidence[];
}

export interface ReadingDocumentOutline {
  passages: PassageOutline[];
  questionRanges: QuestionRangeOutline[];
  issues: string[];
}
