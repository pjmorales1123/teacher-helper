import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { DocumentMeta } from '../lib/types';
import { UploadZone } from './UploadZone';

const SAMPLES = ['lesson-plan.docx', 'class-record.xlsx', 'flower-lesson.pptx'];
const NEW_FILES = [
  { label: 'Word document', file: 'blank.docx', name: 'New document.docx' },
  { label: 'Excel workbook', file: 'blank.xlsx', name: 'New workbook.xlsx' },
  { label: 'PowerPoint deck', file: 'blank.pptx', name: 'New presentation.pptx' },
];
const KIND_LABEL = { docx: 'Document', xlsx: 'Spreadsheet', pptx: 'Presentation' } as const;

/** Home screen: upload files, open recent ones, try the samples. */
export function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const [docs, setDocs] = useState<DocumentMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => api.list().then(setDocs, (e: Error) => setError(e.message)), []);
  useEffect(() => { void refresh(); }, [refresh]);

  const upload = async (files: File[]) => {
    setBusy(true); setError(null);
    try {
      const made = [];
      for (const f of files) made.push(await api.upload(f));
      if (made.length === 1) onOpen(made[0].id); else await refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const trySample = async (name: string) => {
    const blob = await (await fetch(`/samples/${name}`)).blob();
    await upload([new File([blob], name)]);
  };

  /** An empty file (A4, 1-inch margins, Arial 12) the teacher can fill by typing or by asking the AI. */
  const createNew = async (file: string, name: string) => {
    const blob = await (await fetch(`/blank/${file}`)).blob();
    await upload([new File([blob], name)]);
  };

  const remove = async (d: DocumentMeta) => {
    if (!confirm(`Delete "${d.name}" and all its saved versions?`)) return;
    await api.remove(d.id).catch((e: Error) => setError(e.message));
    await refresh();
  };

  return (
    <div className="library">
      <header className="lib-head">
        <h1>Guro Buddy</h1>
        <p>An AI-first editor for lesson plans, class records and slides. Your files stay on this computer.</p>
      </header>
      <div className="new-files">Start new: {NEW_FILES.map((n) => <button key={n.file} className="primary" onClick={() => createNew(n.file, n.name)} disabled={busy}>{n.label}</button>)}</div>
      <UploadZone busy={busy} onFiles={upload} />
      <div className="samples">Try a sample: {SAMPLES.map((s) => <button key={s} className="chip" onClick={() => trySample(s)} disabled={busy}>{s}</button>)}</div>
      {error && <p className="error">{error}</p>}
      <h2>Recent files</h2>
      {docs === null ? <p>Loading…</p> : docs.length === 0 ? <p className="muted">No files yet. Upload one to start.</p> : (
        <ul className="doc-list">
          {docs.map((d) => (
            <li key={d.id}>
              <button className="doc" onClick={() => onOpen(d.id)}>
                <span className={`kind kind-${d.kind}`}>{d.kind.toUpperCase()}</span>
                <span className="doc-name">{d.name}</span>
                <span className="muted">{KIND_LABEL[d.kind]} · v{d.version} · {new Date(d.updated_at).toLocaleString()}</span>
              </button>
              <button className="link danger" onClick={() => remove(d)} aria-label={`Delete ${d.name}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
