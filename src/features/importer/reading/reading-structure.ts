import type { NormalizedRect, SourceEvidence, VerificationState } from '../domain';

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
  questionType?: ReadingQuestionType;
  instructionConstraints?: InstructionConstraints;
  evidence: SourceEvidence[];
}

export interface InstructionConstraints {
  maxWords?: number;
  numbersAllowed?: boolean;
  optionReuse?: 'ONCE' | 'MULTIPLE';
  requiredSelections?: number;
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

export interface StructuredQuestionOption {
  id: string;
  label: string;
}

export interface StructuredQuestionDraft {
  id: string;
  number: number;
  questionType: ReadingQuestionType;
  prompt: string;
  options?: StructuredQuestionOption[];
  constraints?: InstructionConstraints;
  assetId?: string;
  anchor?: NormalizedRect;
  evidence: SourceEvidence[];
}

export interface StructuredQuestionGroupDraft {
  id: string;
  range: readonly [number, number];
  pageNumber: number;
  sourceText: string;
  questionType?: ReadingQuestionType | null;
  instructionConstraints?: InstructionConstraints;
  questions: StructuredQuestionDraft[];
  evidence: SourceEvidence[];
}

export interface ImportedVisualAssetDraft {
  id: string;
  documentId: string;
  pageNumber: number;
  crop: NormalizedRect;
  mediaType: 'image/png';
  bytes: ArrayBuffer;
  verificationState: VerificationState;
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
  visualAssets?: ImportedVisualAssetDraft[];
  reviewItems: StructureReviewItem[];
}
