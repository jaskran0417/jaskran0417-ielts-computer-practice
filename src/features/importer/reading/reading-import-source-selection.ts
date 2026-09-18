import type { ImportSourceAssignment, PageRange } from '../bundle/domain';
import type { NormalizedRect } from '../domain';
import type { ImportDraft, ImportFieldRecord } from '../local/import-repository';
import type { ReadingSourceBlock } from './types';

export function preferredImportFieldEvidence(field: ImportFieldRecord) {
  return field.verification.passA?.evidence ?? field.verification.passB?.evidence;
}

function normalizeImportedSemanticText(value: string): string {
  return value
    .replace(/[ \t]*\u00A0[ \t]*/g, ' ')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export function preferredImportFieldText(field: ImportFieldRecord): string | null {
  const value =
    field.confirmedValue ??
    field.verification.normalizedValue ??
    field.verification.passA?.value ??
    field.verification.passB?.value;
  const normalized = value ? normalizeImportedSemanticText(value).trim() : '';
  return normalized || null;
}

function inRanges(pageNumber: number, ranges?: PageRange[]): boolean {
  return !ranges?.length || ranges.some(
    (range) => pageNumber >= range.startPage && pageNumber <= range.endPage,
  );
}

function sameRegion(left: NormalizedRect | undefined, right: NormalizedRect | undefined): boolean {
  if (!left || !right) return !left && !right;
  const tolerance = 0.0001;
  return (
    Math.abs(left.x - right.x) <= tolerance &&
    Math.abs(left.y - right.y) <= tolerance &&
    Math.abs(left.width - right.width) <= tolerance &&
    Math.abs(left.height - right.height) <= tolerance
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
        inRanges(evidence.pageNumber, assignment.pageRanges) &&
        (assignment.region
          ? Boolean(field.sourceRegion && sameRegion(field.sourceRegion, assignment.region))
          : !field.sourceRegion),
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
