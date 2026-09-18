import { parseAnswerKey } from '../answer-key/parse-answer-key';
import type { ParsedAnswerEntry } from '../answers/types';
import type { ImportFieldRecord } from '../local/import-repository';
import type { ReadingQuestionDraft } from './types';
import {
  preferredImportFieldEvidence,
  preferredImportFieldText,
} from './reading-import-source-selection';

export function answerEntriesFromAssignedFields(
  fields: ImportFieldRecord[],
  questions: ReadingQuestionDraft[],
): ParsedAnswerEntry[] {
  const constraints = new Map(
    questions.map((question) => [question.number, question.instructionConstraints]),
  );
  const entries: ParsedAnswerEntry[] = [];

  for (const field of fields) {
    const rawText = preferredImportFieldText(field);
    const evidence = preferredImportFieldEvidence(field);
    if (!rawText || !evidence) continue;

    const parsed = parseAnswerKey(rawText);
    for (const answer of parsed.answers) {
      entries.push({
        questionNumber: answer.questionNumber,
        raw: answer.answer,
        constraints: constraints.get(answer.questionNumber) ?? {},
        evidence: [{ ...evidence, method: 'ANSWER_KEY_A' }],
      });
    }
  }

  return entries;
}
