import { readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export interface FoundFile { path: string; name: string; size: number; modified: string }

export const READABLE = new Set(['.docx', '.xlsx', '.pptx', '.pdf', '.csv', '.txt', '.md', '.json', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
const SKIP = new Set(['node_modules', 'AppData', 'Library', '$RECYCLE.BIN', 'System Volume Information']);

/** Walks allowed folders (bounded) and ranks files whose names contain the query words. */
export function findFiles(folders: string[], query: string, limit = 25): FoundFile[] {
  const words = query.toLowerCase().split(/[\s_\-.]+/).filter((w) => w.length > 1 && !['the', 'file', 'my'].includes(w));
  const hits: (FoundFile & { score: number })[] = [];
  let seen = 0;
  const walk = (dir: string, depth: number) => {
    if (depth > 6 || seen > 20000) return;
    let entries: import('node:fs').Dirent[];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      seen += 1;
      if (e.name.startsWith('.') || e.name.startsWith('~$') || SKIP.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (!e.isFile() || !READABLE.has(extname(e.name).toLowerCase())) continue;
      const name = basename(e.name).toLowerCase();
      const score = words.length ? words.filter((w) => name.includes(w) || full.toLowerCase().includes(w)).length : 1;
      if (!score) continue;
      try {
        const st = statSync(full);
        hits.push({ path: full, name: e.name, size: st.size, modified: st.mtime.toISOString(), score: score + (name.includes(words.join(' ')) ? 1 : 0) });
      } catch { /* vanished */ }
    }
  };
  folders.forEach((f) => walk(f, 0));
  return hits.sort((a, b) => b.score - a.score || b.modified.localeCompare(a.modified)).slice(0, limit).map(({ score: _s, ...f }) => f);
}
