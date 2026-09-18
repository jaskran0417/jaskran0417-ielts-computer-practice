import type { ExtractionPass, VerificationResult } from '../domain';
import { verifyCriticalText } from '../verification';

export interface ParsedAnswer {
  questionNumber: number;
  answer: string;
}

export interface QuestionAnswerVerification {
  questionNumber: number;
  result: VerificationResult;
}

export interface AnswerKeyParseResult {
  answers: ParsedAnswer[];
  verification: QuestionAnswerVerification[];
}

export type AnswerKeyParser = (text: string) => ParsedAnswer[];

export interface AnswerKeyParserOptions {
  parserA?: AnswerKeyParser;
  parserB?: AnswerKeyParser;
}

function stripAnswerCommentary(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+Extra\s+info\b.*$/i, '').trimEnd())
    .join('\n');
}

function parseEntriesWithinLine(line: string): ParsedAnswer[] {
  const entries: ParsedAnswer[] = [];
  const pattern = /(\d{1,3})[.)]?\s+(.+?)(?=(?:\s{2,}|\t+)\d{1,3}[.)]?\s+|$)/g;

  for (const match of line.matchAll(pattern)) {
    const questionNumber = Number(match[1]);
    const answer = match[2].trim();
    if (Number.isInteger(questionNumber) && questionNumber > 0 && answer) {
      entries.push({ questionNumber, answer });
    }
  }

  return entries;
}

export const parseAnswerKeyByLines: AnswerKeyParser = (text) =>
  stripAnswerCommentary(text)
    .split(/\r?\n/)
    .flatMap((line) => parseEntriesWithinLine(line.trim()))
    .sort((a, b) => a.questionNumber - b.questionNumber);

export const parseAnswerKeyByTokens: AnswerKeyParser = (text) => {
  const normalized = stripAnswerCommentary(text).replace(/\r/g, ' ').trim();
  const entries: ParsedAnswer[] = [];
  const pattern = /(\d{1,3})[.)]?\s+(.+?)(?=(?:\n+|[ \t]{2,})\d{1,3}[.)]?\s+|$)/gs;

  for (const match of normalized.matchAll(pattern)) {
    const questionNumber = Number(match[1]);
    const answer = match[2].trim();
    if (Number.isInteger(questionNumber) && questionNumber > 0 && answer) {
      entries.push({ questionNumber, answer });
    }
  }

  return entries.sort((a, b) => a.questionNumber - b.questionNumber);
};

function toPass(
  parsed: ParsedAnswer | undefined,
  parser: 'A' | 'B',
): ExtractionPass {
  return {
    value: parsed?.answer ?? '',
    confidence: null,
    evidence: {
      documentId: 'answer-key',
      pageNumber: 1,
      method: parser === 'A' ? 'ANSWER_KEY_A' : 'ANSWER_KEY_B',
    },
  };
}

export function parseAnswerKey(
  text: string,
  options: AnswerKeyParserOptions = {},
): AnswerKeyParseResult {
  const parsedA = (options.parserA ?? parseAnswerKeyByLines)(text);
  const parsedB = (options.parserB ?? parseAnswerKeyByTokens)(text);
  const byQuestionA = new Map(parsedA.map((answer) => [answer.questionNumber, answer]));
  const byQuestionB = new Map(parsedB.map((answer) => [answer.questionNumber, answer]));
  const questionNumbers = [...new Set([...byQuestionA.keys(), ...byQuestionB.keys()])].sort(
    (a, b) => a - b,
  );

  const verification = questionNumbers.map((questionNumber): QuestionAnswerVerification => ({
    questionNumber,
    result: verifyCriticalText(
      toPass(byQuestionA.get(questionNumber), 'A'),
      toPass(byQuestionB.get(questionNumber), 'B'),
    ),
  }));

  const answers = verification.flatMap(({ questionNumber, result }): ParsedAnswer[] =>
    result.state === 'VERIFIED' && result.normalizedValue
      ? [{ questionNumber, answer: result.normalizedValue }]
      : [],
  );

  return { answers, verification };
}
