import type { ImportSourceAssignment, PageRange } from '../bundle/domain';
import type { ImportDraft, ImportFieldRecord } from '../local/import-repository';
import type { ReadingSourceBlock } from './types';

export function preferredImportFieldEvidence(field: ImportFieldRecord) {
  return field.verification.passA?.evidence ?? field.verification.passB?.evidence;
}

export function preferredImportFieldText(field: ImportFieldRecord): string | null {
  const value =
    field.confirmedValue ??
    field.verification.normalizedValue ??
    field.verification.passA?.value ??
    field.verification.passB?.value;
  return value?.trim() ? value.trim() : null;
}

function inRanges(pageNumber: number, ranges?: PageRange[]): boolean {
  return !ranges?.length || ranges.some(
    (range) => pageNumber >= range.startPage && pageNumber <= range.endPage,
  );
}

export function fieldsForAssignments(
  draft: ImportDraft,
  assignments: ImportSourceAssignment[],
): ImportFieldRecord[] {
  return draft.fields.filter((field) => {
    const evidence = preferredImportFieldEvidence(field);
    return Boolean(evidence && assignments.some(
      (assignment) =>
        assignment.sourceDocumentId === evidence.documentId &&
        inRanges(evidence.pageNumber, assignment.pageRanges),
    ));
  });
}

export function fieldsToReadingBlocks(fields: ImportFieldRecord[]): ReadingSourceBlock[] {
  return fields.flatMap((field) => {
    const evidence = preferredImportFieldEvidence(field);
    const text = preferredImportFieldText(field);
    return evidence && text
      ? [{ pageNumber: evidence.pageNumber, text, evidence: [evidence] }]
      : [];
  });
}
