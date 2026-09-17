import type { ExtractionPass } from '../domain';
import type { ImportFieldRecord, SourceDocumentRecord } from '../local/import-repository';

interface SourceEvidencePaneProps {
  field: ImportFieldRecord;
  documents: SourceDocumentRecord[];
}

function methodLabel(method: ExtractionPass['evidence']['method']): string {
  return method.replace(/_/g, ' ');
}

function EvidencePass({
  label,
  pass,
  documents,
}: {
  label: string;
  pass: ExtractionPass;
  documents: SourceDocumentRecord[];
}) {
  const document = documents.find((item) => item.id === pass.evidence.documentId);

  return (
    <article className="evidence-pass">
      <div className="evidence-pass-heading">
        <strong>{label}</strong>
        <span>{methodLabel(pass.evidence.method)}</span>
      </div>
      <p className="evidence-meta">
        <span>{document?.name ?? pass.evidence.documentId}</span>
        <span>Page {pass.evidence.pageNumber}</span>
        {pass.confidence === null ? null : <span>{Math.round(pass.confidence)}% confidence</span>}
      </p>
      <blockquote>{pass.value || 'No text extracted'}</blockquote>
    </article>
  );
}

export function SourceEvidencePane({ field, documents }: SourceEvidencePaneProps) {
  const passes = [field.verification.passA, field.verification.passB].filter(
    (pass): pass is ExtractionPass => Boolean(pass),
  );

  return (
    <section className="evidence-pane" aria-labelledby="source-evidence-title">
      <div className="pane-heading">
        <div>
          <p className="page-eyebrow">Evidence</p>
          <h2 id="source-evidence-title">Source evidence</h2>
        </div>
        <span className="field-id-chip">{field.id}</span>
      </div>

      {passes.length > 0 ? (
        <div className="evidence-pass-list">
          {passes.map((pass, index) => (
            <EvidencePass
              key={`${pass.evidence.documentId}-${pass.evidence.pageNumber}-${index}`}
              label={`Pass ${index === 0 ? 'A' : 'B'}`}
              pass={pass}
              documents={documents}
            />
          ))}
        </div>
      ) : (
        <p className="empty-copy">No source evidence is attached to this field yet.</p>
      )}

      {field.verification.reasons.length > 0 ? (
        <div className="evidence-reasons" role="note">
          <strong>Why review is required</strong>
          <ul>
            {field.verification.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
