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
