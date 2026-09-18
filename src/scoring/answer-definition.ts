import type { SourceEvidence, VerificationState } from '../features/importer/domain';

export interface AnswerNormalizationPolicy {
  caseSensitive: boolean;
  collapseWhitespace: boolean;
  punctuation: 'STRICT' | 'IGNORE_TERMINAL' | 'LENIENT';
  maxWords?: number;
  numbersAllowed?: boolean;
  orderSensitive?: boolean;
}

interface AnswerDefinitionBase {
  questionId: string;
  policy: AnswerNormalizationPolicy;
  sourceEvidence: SourceEvidence[];
  verificationState: VerificationState;
}

export type AnswerDefinition =
  | (AnswerDefinitionBase & {
      kind: 'TEXT';
      accepted: string[];
    })
  | (AnswerDefinitionBase & {
      kind: 'OPTION';
      acceptedOptionIds: string[];
    })
  | (AnswerDefinitionBase & {
      kind: 'ENUM';
      accepted: Array<'TRUE' | 'FALSE' | 'NOT_GIVEN' | 'YES' | 'NO'>;
    });
