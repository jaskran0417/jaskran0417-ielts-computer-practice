import type { ReadingQuestionType } from './reading-structure';

export interface QuestionTypeRecognition {
  type: ReadingQuestionType | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

type Rule = {
  type: ReadingQuestionType;
  reason: string;
  matches(text: string): boolean;
};

const RULES: Rule[] = [
  {
    type: 'TRUE_FALSE_NOT_GIVEN',
    reason: 'Instruction explicitly uses True, False and Not Given',
    matches: (text) =>
      /\bTrue\b/i.test(text) &&
      /\bFalse\b/i.test(text) &&
      /\bNot\s+Given\b/i.test(text),
  },
  {
    type: 'YES_NO_NOT_GIVEN',
    reason: 'Instruction explicitly uses Yes, No and Not Given',
    matches: (text) =>
      /\bYes\b/i.test(text) &&
      /\bNo\b/i.test(text) &&
      /\bNot\s+Given\b/i.test(text),
  },
  {
    type: 'DIAGRAM_LABEL_COMPLETION',
    reason: 'Instruction explicitly asks to label a diagram',
    matches: (text) => /\blabel\s+(?:the|a)\s+diagram\b/i.test(text),
  },
  {
    type: 'TABLE_COMPLETION',
    reason: 'Instruction explicitly asks to complete a table',
    matches: (text) => /\bcomplete\s+(?:the|a)\s+table\b/i.test(text),
  },
  {
    type: 'FLOW_CHART_COMPLETION',
    reason: 'Instruction explicitly asks to complete a flow chart',
    matches: (text) => /\bcomplete\s+(?:the|a)\s+flow[-\s]?chart\b/i.test(text),
  },
  {
    type: 'SUMMARY_COMPLETION',
    reason: 'Instruction explicitly asks to complete a summary',
    matches: (text) => /\bcomplete\s+(?:the|a)\s+summary\b/i.test(text),
  },
  {
    type: 'NOTE_COMPLETION',
    reason: 'Instruction explicitly asks to complete notes',
    matches: (text) => /\bcomplete\s+(?:the|these|a)\s+notes?\b/i.test(text),
  },
  {
    type: 'SENTENCE_COMPLETION',
    reason: 'Instruction explicitly asks to complete sentences',
    matches: (text) =>
      /\bcomplete\s+(?:the|each|these|a)\s+sentences?\b/i.test(text) &&
      !/\bcorrect\s+ending\b/i.test(text),
  },
  {
    type: 'MATCHING_HEADINGS',
    reason: 'Instruction explicitly asks for correct headings',
    matches: (text) =>
      /\b(?:choose|match)\b[^.]*\b(?:correct\s+)?headings?\b/i.test(text) ||
      /\blist\s+of\s+headings\b/i.test(text),
  },
  {
    type: 'MATCHING_SENTENCE_ENDINGS',
    reason: 'Instruction explicitly asks for sentence endings',
    matches: (text) => /\bcorrect\s+ending\b/i.test(text),
  },
  {
    type: 'MATCHING_INFORMATION',
    reason: 'Instruction asks which paragraph or section contains information',
    matches: (text) =>
      /\bwhich\s+(?:paragraphs?|sections?)\s+contain\b/i.test(text),
  },
  {
    type: 'MATCHING_FEATURES',
    reason: 'Instruction asks to match information with a person or feature',
    matches: (text) =>
      /\bmatch\s+each\b[^.]*\b(?:person|people|feature|name|statement)\b/i.test(text) ||
      /\bcorrect\s+(?:person|people|feature)\b/i.test(text),
  },
  {
    type: 'MULTI_SELECT',
    reason: 'Instruction requires multiple selected letters or options',
    matches: (text) =>
      /\bchoose\s+(?:TWO|THREE|FOUR|FIVE|[2-5])\s+(?:letters?|answers?|options?)\b/i.test(text),
  },
  {
    type: 'SINGLE_CHOICE',
    reason: 'Instruction asks for one appropriate/correct letter',
    matches: (text) =>
      /\bchoose\s+(?:the\s+)?(?:appropriate|correct)\s+(?:letter|answer)\b/i.test(text) ||
      /\bchoose\s+(?:the\s+)?appropriate\s+letters?\s+[A-Z](?:\s*,\s*[A-Z])+/i.test(text),
  },
  {
    type: 'SHORT_ANSWER',
    reason: 'Instruction explicitly asks to answer questions from the passage',
    matches: (text) =>
      /\b(?:from\s+the\s+passage\s+)?to\s+answer\s+the\s+questions?\s+below\b/i.test(text) ||
      /\banswer\s+the\s+(?:following\s+)?questions?\b/i.test(text),
  },
];

export function recognizeQuestionType(text: string): QuestionTypeRecognition {
  const matched = RULES.filter((rule) => rule.matches(text));

  if (matched.length === 0) {
    return {
      type: null,
      confidence: 'LOW',
      reasons: ['No supported question-type evidence'],
    };
  }

  const distinctTypes = [...new Set(matched.map((rule) => rule.type))];
  if (distinctTypes.length > 1) {
    return {
      type: null,
      confidence: 'LOW',
      reasons: ['Conflicting question-type evidence'],
    };
  }

  return {
    type: distinctTypes[0],
    confidence: 'HIGH',
    reasons: matched.map((rule) => rule.reason),
  };
}
