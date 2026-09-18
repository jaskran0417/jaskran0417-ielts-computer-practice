import type {
  ImportBundle,
  ImportSourceAssignment,
  ImportSourceRole,
  PageRange,
} from './types';

export type ImportBundleValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

export interface PublicationReadiness {
  ready: boolean;
  reasons: string[];
}

const NON_SEMANTIC_OVERLAP_ROLES = new Set<ImportSourceRole>([
  'SUPPORTING_EVIDENCE',
]);

function pagesInRange(range: PageRange): number[] {
  const pages: number[] = [];
  for (let page = range.startPage; page <= range.endPage; page += 1) {
    pages.push(page);
  }
  return pages;
}

function invalidRange(assignment: ImportSourceAssignment): PageRange | undefined {
  return assignment.pageRanges.find(
    (range) =>
      !Number.isInteger(range.startPage) ||
      !Number.isInteger(range.endPage) ||
      range.startPage <= 0 ||
      range.endPage <= 0 ||
      range.startPage > range.endPage,
  );
}

export function validateImportBundleSources(
  bundle: ImportBundle,
): ImportBundleValidation {
  const errors: string[] = [];

  for (const assignment of bundle.assignments) {
    const invalid = invalidRange(assignment);
    if (invalid) {
      errors.push(
        `${assignment.role} has invalid page range ${invalid.startPage}-${invalid.endPage}`,
      );
    }
  }

  const semanticAssignments = bundle.assignments.filter(
    (assignment) => !NON_SEMANTIC_OVERLAP_ROLES.has(assignment.role),
  );

  const claimedPages = new Map<
    string,
    { role: ImportSourceRole; assignmentId: string }
  >();

  for (const assignment of semanticAssignments) {
    if (invalidRange(assignment)) continue;

    for (const range of assignment.pageRanges) {
      for (const page of pagesInRange(range)) {
        const key = `${assignment.documentId}:${page}`;
        const previous = claimedPages.get(key);

        if (
          previous &&
          previous.assignmentId !== assignment.id &&
          previous.role !== assignment.role
        ) {
          errors.push(
            `Page ${page} cannot be both ${previous.role} and ${assignment.role}`,
          );
          continue;
        }

        claimedPages.set(key, {
          role: assignment.role,
          assignmentId: assignment.id,
        });
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

function hasRole(bundle: ImportBundle, role: ImportSourceRole): boolean {
  return bundle.assignments.some(
    (assignment) =>
      assignment.role === role &&
      assignment.pageRanges.some(
        (range) =>
          Number.isInteger(range.startPage) &&
          Number.isInteger(range.endPage) &&
          range.startPage > 0 &&
          range.endPage >= range.startPage,
      ),
  );
}

export function publicationReadiness(
  bundle: ImportBundle,
): PublicationReadiness {
  const reasons: string[] = [];
  const sourceValidation = validateImportBundleSources(bundle);

  if (!sourceValidation.ok) {
    reasons.push(...sourceValidation.errors);
  }

  if (bundle.module === 'READING') {
    if (!hasRole(bundle, 'QUESTION_MATERIAL')) {
      reasons.push('Reading requires question material');
    }

    if (!hasRole(bundle, 'ANSWER_KEY')) {
      reasons.push('Reading requires an answer key before it can be auto-scored');
    }
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}
