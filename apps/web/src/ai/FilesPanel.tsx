import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Which folders on this computer the AI may read (search and open files there when the teacher
 * mentions them). Nothing is readable until the teacher ticks a folder.
 */
export function FilesPanel() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.folders().then((f) => { setAllowed(f.allowed); setSuggested(f.suggested); }, () => {}); }, []);

  const save = async (next: string[]) => {
    setError(null);
    try { const f = await api.setFolders(next); setAllowed(f.allowed); setSuggested(f.suggested); } catch (e) { setError((e as Error).message); }
  };
  const toggle = (dir: string) => {
    const next = allowed.includes(dir) ? allowed.filter((d) => d !== dir) : [...allowed, dir];
    setAllowed(next); // show the tick at once; the server confirms the real list
    void save(next);
  };
  const add = async () => {
    if (!custom.trim()) return;
    const before = allowed.length;
    await save([...allowed, custom.trim()]);
    setCustom('');
    if ((await api.folders()).allowed.length === before) setError('That folder was not found on this computer.');
  };
  const all = [...new Set([...suggested, ...allowed])];

  return (
    <div className="files">
      <button className={`files-btn ${allowed.length ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} title="Folders the AI may read">
        Files{allowed.length ? ` · ${allowed.length}` : ''}
      </button>
      {open && (
        <div className="files-pop">
          <strong>Folders the AI may read</strong>
          <p className="muted">When you mention a file (“use the results in Week3 quiz.docx”), the AI searches only these folders. It never changes them.</p>
          {all.map((d) => (
            <label key={d}><input type="checkbox" checked={allowed.includes(d)} onChange={() => toggle(d)} /> {d}</label>
          ))}
          <div className="files-add">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Another folder, e.g. D:\School Files" onKeyDown={(e) => e.key === 'Enter' && add()} />
            <button onClick={add}>Add</button>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="link" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}
