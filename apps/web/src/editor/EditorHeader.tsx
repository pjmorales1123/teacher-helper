import { useState } from 'react';
import { api } from '../lib/api';
import type { DocumentMeta, VersionMeta } from '../lib/types';
import type { SaveState } from './useDocument';

interface Props {
  meta: DocumentMeta & { versions: VersionMeta[] };
  save: SaveState;
  onSave: () => void;
  onRename: (name: string) => Promise<void>;
  onBack: () => void;
}

const LABEL: Record<SaveState, string> = { saved: 'All changes saved', dirty: 'Unsaved changes', saving: 'Saving…', error: 'Save failed' };

/** Title bar: back to library, file name, save status, save, download, version history. */
export function EditorHeader({ meta, save, onSave, onRename, onBack }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meta.name);

  const commit = async () => {
    setEditing(false);
    if (name !== meta.name) await onRename(name).catch(() => setName(meta.name));
  };

  return (
    <header className="topbar">
      <button className="link" onClick={onBack}>← Library</button>
      <span className={`kind kind-${meta.kind}`}>{meta.kind.toUpperCase()}</span>
      {editing
        ? <input className="title-input" value={name} autoFocus onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
        : <button className="title" title="Rename" onClick={() => setEditing(true)}>{meta.name}</button>}
      <span className={`save-state ${save}`}>{LABEL[save]} · v{meta.version}</span>
      <span className="spacer" />
      <details className="versions">
        <summary>History</summary>
        <ul>
          {meta.versions.map((v) => (
            <li key={v.version}>
              <a href={api.downloadUrl(meta.id, v.version)}>v{v.version}</a> {v.note ?? ''}
              <small>{new Date(v.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      </details>
      <a className="btn" href={api.downloadUrl(meta.id)}>Download</a>
      <button className="primary" onClick={onSave} disabled={save === 'saving'}>Save</button>
    </header>
  );
}
