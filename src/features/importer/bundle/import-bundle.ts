import type {
  ImportBundle,
  ImportSourceAssignment,
  PageRange,
} from './domain';

function validRange(range: PageRange): boolean {
  return (
    Number.isInteger(range.startPage) &&
    Number.isInteger(range.endPage) &&
    range.startPage > 0 &&
    range.endPage > 0 &&
    range.startPage <= range.endPage
  );
}

function sameRanges(left: PageRange[] | undefined, right: PageRange[] | undefined): boolean {
  const a = left ?? [];
  const b = right ?? [];
  if (a.length !== b.length) return false;

  return a.every(
    (range, index) =>
      range.startPage === b[index]?.startPage &&
      range.endPage === b[index]?.endPage,
  );
}

function sameAssignment(
  left: ImportSourceAssignment,
  right: ImportSourceAssignment,
): boolean {
  return (
    left.sourceDocumentId === right.sourceDocumentId &&
    left.role === right.role &&
    sameRanges(left.pageRanges, right.pageRanges)
  );
}

function rangesOverlap(left: PageRange, right: PageRange): boolean {
  return left.startPage <= right.endPage && right.startPage <= left.endPage;
}

function sameRoleOverlap(
  left: ImportSourceAssignment,
  right: ImportSourceAssignment,
): boolean {
  if (
    left.sourceDocumentId !== right.sourceDocumentId ||
    left.role !== right.role
  ) {
    return false;
  }

  const leftRanges = left.pageRanges ?? [];
  const rightRanges = right.pageRanges ?? [];

  if (leftRanges.length === 0 || rightRanges.length === 0) {
    return true;
  }

  return leftRanges.some((a) => rightRanges.some((b) => rangesOverlap(a, b)));
}

export function validateImportBundle(bundle: ImportBundle): string[] {
  const errors: string[] = [];
  const documentIds = new Set(bundle.sourceDocuments.map((document) => document.id));

  if (!bundle.title.trim()) {
    errors.push('Import bundle title is required');
  }

  for (const assignment of bundle.assignments) {
    if (!documentIds.has(assignment.sourceDocumentId)) {
      errors.push('Source role assignment references an unknown source document');
    }

    if (
      assignment.pageRanges?.some((range) => !validRange(range))
    ) {
      errors.push('Page ranges must use positive pages with startPage <= endPage');
    }
  }

  for (let leftIndex = 0; leftIndex < bundle.assignments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < bundle.assignments.length; rightIndex += 1) {
      const left = bundle.assignments[leftIndex];
      const right = bundle.assignments[rightIndex];

      if (left && right && sameAssignment(left, right)) {
        errors.push('Duplicate source role assignment');
      } else if (left && right && sameRoleOverlap(left, right)) {
        errors.push('Page ranges for the same source role must not overlap');
      }
    }
  }

  if (
    bundle.module === 'READING' &&
    !bundle.assignments.some((assignment) => assignment.role === 'QUESTION_MATERIAL')
  ) {
    errors.push('Reading import requires question material');
  }

  return [...new Set(errors)];
}

export function assignSourceRole(
  bundle: ImportBundle,
  assignment: ImportSourceAssignment,
  nowMs: number,
): ImportBundle {
  if (bundle.assignments.some((current) => sameAssignment(current, assignment))) {
    throw new Error('This source role assignment already exists');
  }

  const next: ImportBundle = {
    ...bundle,
    assignments: [...bundle.assignments, assignment],
    updatedAtMs: nowMs,
  };

  const errors = validateImportBundle(next).filter(
    (error) => error !== 'Reading import requires question material',
  );

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return next;
}
