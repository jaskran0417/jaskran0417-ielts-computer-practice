import type { ImportDraft } from './local/import-repository';

export interface ImportWorkspaceProps {
  processFile(file: File): Promise<ImportDraft>;
}

export function ImportWorkspace({ processFile }: ImportWorkspaceProps) {
  void processFile;
  return <section aria-label="Import workspace" />;
}
