import type {
  QuestionTypeRecognition,
  ReadingQuestionType,
} from './types';

interface RecognitionInput {
  instructionText: string;
  bodyText: string;
  hasDiagram: boolean;
  hasTable: boolean;
}

function high(type: ReadingQuestionType, reason: string): QuestionTypeRecognition {
  return {
    type,
    confidence: 'HIGH',
    reasons: [reason],
  };
}

export function recognizeReadingQuestionType(
  input: RecognitionInput,
): QuestionTypeRecognition {
  const instruction = input.instructionText.toUpperCase().replace(/\s+/g, ' ');
  const body = input.bodyText.toUpperCase().replace(/\s+/g, ' ');
  const combined = `${instruction} ${body}`;

  if (
    input.hasDiagram &&
    /\bLABEL\b/.test(instruction) &&
    /\bDIAGRAM\b/.test(instruction)
  ) {
    return high(
      'DIAGRAM_LABEL_COMPLETION',
      'Instruction explicitly asks to label a diagram',
    );
  }

  if (input.hasTable && /\bCOMPLETE\b/.test(instruction) && /\bTABLE\b/.test(instruction)) {
    return high(
      'TABLE_COMPLETION',
      'Instruction explicitly asks to complete a table',
    );
  }

  if (
    /\bTRUE\b/.test(combined) &&
    /\bFALSE\b/.test(combined) &&
    /\bNOT GIVEN\b/.test(combined)
  ) {
    return high(
      'TRUE_FALSE_NOT_GIVEN',
      'Instruction explicitly contains TRUE/FALSE/NOT GIVEN',
    );
  }

  if (
    /\bYES\b/.test(combined) &&
    /\bNO\b/.test(combined) &&
    /\bNOT GIVEN\b/.test(combined)
  ) {
    return high(
      'YES_NO_NOT_GIVEN',
      'Instruction explicitly contains YES/NO/NOT GIVEN',
    );
  }

  if (/\bCORRECT ENDING\b/.test(instruction)) {
    return high(
      'MATCHING_SENTENCE_ENDINGS',
      'Instruction explicitly asks for the correct ending',
    );
  }

  if (
    /\bCORRECT HEADING\b/.test(instruction) ||
    /\bLIST OF HEADINGS\b/.test(combined)
  ) {
    return high(
      'MATCHING_HEADINGS',
      'Instruction explicitly refers to headings',
    );
  }

  if (
    /\bWHICH PARAGRAPHS? CONTAIN\b/.test(instruction) ||
    /\bCORRECT PARAGRAPH\b/.test(instruction)
  ) {
    return high(
      'MATCHING_INFORMATION',
      'Instruction explicitly maps information to paragraphs',
    );
  }

  if (
    /\bCORRECT PERSON\b/.test(instruction) ||
    /\bMATCH EACH\b.*\bPERSON\b/.test(instruction)
  ) {
    return high(
      'MATCHING_FEATURES',
      'Instruction explicitly maps information to people/features',
    );
  }

  if (
    /\bCHOOSE\s+(?:TWO|THREE|FOUR|FIVE|[2-5])\s+(?:(?:CORRECT|OF THE FOLLOWING)\s+)?(?:LETTERS|ANSWERS|OPTIONS)\b/.test(instruction)
  ) {
    return high('MULTI_SELECT', 'Instruction explicitly requests multiple selections');
  }

  if (/\bCOMPLETE\s+(?:THE\s+)?SUMMARY\b/.test(instruction)) {
    return high('SUMMARY_COMPLETION', 'Instruction explicitly asks to complete a summary');
  }
  if (/\bCOMPLETE\s+(?:THE\s+)?NOTES?\b/.test(instruction)) {
    return high('NOTE_COMPLETION', 'Instruction explicitly asks to complete notes');
  }
  if (/\bCOMPLETE\s+(?:THE\s+)?FLOW[ -]?CHART\b/.test(instruction)) {
    return high('FLOW_CHART_COMPLETION', 'Instruction explicitly asks to complete a flow chart');
  }
  if (/\bCOMPLETE\s+(?:THE\s+)?SENTENCES?\b/.test(instruction)) {
    return high('SENTENCE_COMPLETION', 'Instruction explicitly asks to complete sentences');
  }

  if (
    /\bCHOOSE\b.*\b(?:LETTER|LETTERS)\b/.test(instruction) &&
    /\bA\b.*\bB\b.*\bC\b.*\bD\b/.test(instruction) &&
    !/\bTWO\b.*\bLETTERS\b/.test(instruction)
  ) {
    return high(
      'SINGLE_CHOICE',
      'Instruction explicitly asks for one letter from A-D',
    );
  }

  if (
    /\bANSWER THE QUESTIONS\b/.test(instruction) &&
    /\b(?:ONE|TWO|THREE|FOUR|FIVE)\s+WORDS?\b/.test(instruction)
  ) {
    return high(
      'SHORT_ANSWER',
      'Instruction explicitly asks direct questions with a word limit',
    );
  }

  return {
    type: null,
    confidence: 'LOW',
    reasons: ['No deterministic Reading question-type rule matched'],
  };
}
