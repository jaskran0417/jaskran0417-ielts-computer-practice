import type {
  QuestionTypeRecognition,
  ReadingQuestionType,
} from '../reading/types';

interface RecognitionInput {
  instructionText: string;
  bodyText: string;
  hasDiagram: boolean;
  hasTable: boolean;
}

function high(type: ReadingQuestionType, reason: string): QuestionTypeRecognition {
  return { type, confidence: 'HIGH', reasons: [reason] };
}

export function recognizeListeningQuestionType(
  input: RecognitionInput,
): QuestionTypeRecognition {
  const instruction = input.instructionText
    .normalize('NFKC')
    .replace(/s+/g, ' ')
    .trim()
    .toUpperCase();
  const body = input.bodyText
    .normalize('NFKC')
    .replace(/s+/g, ' ')
    .trim()
    .toUpperCase();
  const combined = `${instruction} ${body}`;

  if (
    input.hasDiagram &&
    /\b(?:LABEL|COMPLETE)\b/.test(instruction) &&
    /\b(?:MAP|PLAN|DIAGRAM)\b/.test(instruction)
  ) {
    return high(
      'DIAGRAM_LABEL_COMPLETION',
      'Instruction explicitly asks for map/plan/diagram labels',
    );
  }

  if (
    (input.hasTable || /\bTABLE\b/.test(instruction)) &&
    /\bCOMPLETE\b/.test(instruction)
  ) {
    return high('TABLE_COMPLETION', 'Instruction explicitly asks to complete a table');
  }

  if (/\bCOMPLETE\b.*\bFORM\b|\bFORM\b.*\bCOMPLETE\b/.test(instruction)) {
    return high('FORM_COMPLETION', 'Instruction explicitly asks to complete a form');
  }

  if (/\bCOMPLETE\b.*\bNOTES?\b|\bNOTES?\b.*\bCOMPLETE\b/.test(instruction)) {
    return high('NOTE_COMPLETION', 'Instruction explicitly asks to complete notes');
  }

  if (
    /\bCOMPLETE\b.*\bFLOW[- ]?CHART\b|\bFLOW[- ]?CHART\b.*\bCOMPLETE\b/.test(
      instruction,
    )
  ) {
    return high(
      'FLOW_CHART_COMPLETION',
      'Instruction explicitly asks to complete a flow chart',
    );
  }

  if (
    /\bCOMPLETE\b.*\bSUMMARY\b|\bSUMMARY\b.*\bCOMPLETE\b/.test(instruction)
  ) {
    return high(
      'SUMMARY_COMPLETION',
      'Instruction explicitly asks to complete a summary',
    );
  }

  if (
    /\bCOMPLETE\b.*\bSENTENCES?\b|\bSENTENCES?\b.*\bCOMPLETE\b/.test(
      instruction,
    )
  ) {
    return high(
      'SENTENCE_COMPLETION',
      'Instruction explicitly asks to complete sentences',
    );
  }

  if (
    /\bCHOOSE\b.*\b(?:TWO|THREE|2|3)\b.*\b(?:LETTERS?|ANSWERS?)\b/.test(
      instruction,
    )
  ) {
    return high('MULTI_SELECT', 'Instruction explicitly requires multiple selections');
  }

  if (/\bMATCH\b/.test(instruction)) {
    return high(
      'MATCHING_FEATURES',
      'Instruction explicitly asks to match recorded information to options',
    );
  }

  if (
    /\bCHOOSE\b.*\b(?:CORRECT|ONE)\b.*\b(?:LETTER|ANSWER)\b/.test(
      instruction,
    ) ||
    /\bCHOOSE THE CORRECT LETTER\b/.test(instruction)
  ) {
    return high('SINGLE_CHOICE', 'Instruction explicitly asks for one option');
  }

  if (
    /\bANSWER THE QUESTIONS\b/.test(instruction) &&
    /\b(?:WORD|WORDS|NUMBER|NUMBERS)\b/.test(combined)
  ) {
    return high(
      'SHORT_ANSWER',
      'Instruction asks direct questions with a word/number limit',
    );
  }

  return {
    type: null,
    confidence: 'LOW',
    reasons: ['No deterministic Listening question-type rule matched'],
  };
}
