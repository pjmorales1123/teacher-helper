import { useEffect, useState } from 'react';
import { api, type FolderListing } from '../lib/api';

/** Click through folders on this computer and pick one, like a normal "Choose folder" window. */
export function FolderPicker({ onPick, onClose }: { onPick: (path: string) => void; onClose: () => void }) {
  const [list, setList] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = (path?: string) => api.browse(path).then(setList, (e: Error) => setError(e.message));
  useEffect(() => { void go(); }, []);

  if (!list) return <div className="picker">{error ?? 'Loading folders…'}</div>;
  return (
    <div className="picker">
      <div className="picker-bar">
        <button disabled={!list.parent} onClick={() => go(list.parent ?? undefined)} title="Up one folder">↑</button>
        <button onClick={() => go(list.home)}>Home</button>
        {list.roots.length > 1 && list.roots.map((r) => <button key={r} onClick={() => go(r)}>{r}</button>)}
      </div>
      <div className="picker-path" title={list.path}>{list.path}</div>
      <ul className="picker-list">
        {list.folders.length === 0 && <li className="muted">No folders inside.</li>}
        {list.folders.map((f) => <li key={f.path}><button onClick={() => go(f.path)}>📁 {f.name}</button></li>)}
      </ul>
      <div className="picker-actions">
        <button className="primary" onClick={() => onPick(list.path)}>Allow this folder</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
