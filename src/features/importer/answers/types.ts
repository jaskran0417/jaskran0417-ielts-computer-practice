import type {
  SourceEvidence,
  VerificationState,
} from '../domain';
import type { InstructionConstraints } from '../reading/types';

export interface AnswerNormalizationPolicy {
  caseSensitive: boolean;
  collapseWhitespace: boolean;
  punctuation: 'STRICT' | 'IGNORE_TERMINAL' | 'LENIENT';
  maxWords?: number;
  numbersAllowed?: boolean;
  orderSensitive?: boolean;
}

export interface AnswerDefinitionDraft {
  questionNumber: number;
  canonical: string[];
  alternatives: string[][];
  normalization: AnswerNormalizationPolicy;
  sourceEvidence: SourceEvidence[];
  verificationState: VerificationState;
}

export interface ParsedAnswerEntry {
  questionNumber: number;
  raw: string;
  constraints: InstructionConstraints;
  evidence: SourceEvidence[];
}
