import type { ImportFieldRecord, SourceDocumentRecord } from '../local/import-repository';

function EvidencePass({ label, value, method, confidence }: {
  label: string;
  value: string;
  method: string;
  confidence: number | null;
}) {
  return (
    <article className="evidence-pass">
      <div className="evidence-pass-heading">
        <strong>{label}</strong>
        <span>{method}</span>
      </div>
      <p>{value || 'No readable text returned'}</p>
      {confidence === null ? null : <small>Confidence {Math.round(confidence)}%</small>}
    </article>
  );
}

export function SourceEvidencePane({
  field,
  sourceDocuments,
}: {
  field: ImportFieldRecord | null;
  sourceDocuments: SourceDocumentRecord[];
}) {
  if (!field) {
    return (
      <section className="evidence-pane" aria-label="Source evidence">
        <p className="empty-copy">Select an imported field to inspect its source evidence.</p>
      </section>
    );
  }

  const { passA, passB } = field.verification;
  const evidence = passA?.evidence ?? passB?.evidence;
  const source = sourceDocuments.find((document) => document.id === evidence?.documentId);
  const pages = [...new Set([passA?.evidence.pageNumber, passB?.evidence.pageNumber].filter((page): page is number => typeof page === 'number'))];

  return (
    <section className="evidence-pane" aria-label="Source evidence">
      <div className="evidence-heading">
        <div>
          <p className="page-eyebrow">Source evidence</p>
          <h2>{source?.name ?? 'Imported source'}</h2>
        </div>
        {pages.length === 1 ? <span className="evidence-page">Page {pages[0]}</span> : null}
        {pages.length > 1 ? <span className="evidence-page">Pages {pages.join(', ')}</span> : null}
      </div>

      {field.verification.reasons.length > 0 ? (
        <div className="evidence-reasons" role="note">
          {field.verification.reasons.map((reason) => <p key={reason}>{reason}</p>)}
        </div>
      ) : null}

      <div className="evidence-pass-grid">
        {passA ? (
          <EvidencePass
            label="Pass A"
            value={passA.value}
            method={passA.evidence.method}
            confidence={passA.confidence}
          />
        ) : null}
        {passB ? (
          <EvidencePass
            label="Pass B"
            value={passB.value}
            method={passB.evidence.method}
            confidence={passB.confidence}
          />
        ) : null}
      </div>

      {!passA && !passB ? (
        <p className="empty-copy">No extraction evidence was captured for this field.</p>
      ) : null}
    </section>
  );
}
