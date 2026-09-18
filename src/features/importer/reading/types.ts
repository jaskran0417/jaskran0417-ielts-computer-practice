import type { NormalizedRect, SourceEvidence, VerificationState } from '../domain';

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


export interface InstructionConstraints {
  maxWords?: number;
  numbersAllowed?: boolean;
  optionLabels?: string[];
}

export type ReadingQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE_NOT_GIVEN'
  | 'YES_NO_NOT_GIVEN'
  | 'MATCHING_INFORMATION'
  | 'MATCHING_HEADINGS'
  | 'MATCHING_FEATURES'
  | 'MATCHING_SENTENCE_ENDINGS'
  | 'SHORT_ANSWER'
  | 'SENTENCE_COMPLETION'
  | 'SUMMARY_COMPLETION'
  | 'NOTE_COMPLETION'
  | 'TABLE_COMPLETION'
  | 'FLOW_CHART_COMPLETION'
  | 'DIAGRAM_LABEL_COMPLETION';

export interface QuestionTypeRecognition {
  type: ReadingQuestionType | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}


export interface ImportedVisualRegion {
  id: string;
  sourceDocumentId: string;
  pageNumber: number;
  kind: 'DIAGRAM' | 'TABLE' | 'OTHER';
  crop: NormalizedRect;
}

export interface VisualAnchorDraft {
  questionNumber: number;
  visualRegionId: string;
  anchor: NormalizedRect | null;
  verificationState: VerificationState;
}

export interface StructureReviewItem {
  id: string;
  kind: 'DOCUMENT_STRUCTURE' | 'QUESTION_TYPE' | 'QUESTION_TEXT' | 'OPTION_LIST' | 'VISUAL_ANCHOR';
  questionNumber?: number;
  message: string;
  evidence: SourceEvidence[];
}

export interface ReadingQuestionDraft {
  id: string;
  number: number;
  type: ReadingQuestionType;
  prompt: string;
  instructionConstraints: InstructionConstraints;
  evidence: SourceEvidence[];
  visualRegionId?: string;
  options?: Array<{ id: string; label: string }>;
  allowOptionReuse?: boolean;
}

export interface ReadingQuestionGroupDraft {
  id: string;
  startQuestion: number;
  endQuestion: number;
  type: ReadingQuestionType;
  instructionText: string;
  instructionConstraints: InstructionConstraints;
  questions: ReadingQuestionDraft[];
  evidence: SourceEvidence[];
}

export interface ReadingSectionDraft {
  id: string;
  passageNumber: number;
  title: string | null;
  pageNumbers: number[];
  passageText: string[];
  questionGroups: ReadingQuestionGroupDraft[];
  evidence: SourceEvidence[];
}

export interface StructuredReadingDraft {
  title: string;
  sections: ReadingSectionDraft[];
  reviewItems: StructureReviewItem[];
}
