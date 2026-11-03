import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** Drive roots on Windows (C:\, D:\ ...), the filesystem root elsewhere. */
function roots(): string[] {
  if (process.platform !== 'win32') return ['/'];
  return 'CDEFGHIJ'.split('').map((d) => `${d}:\\`).filter((d) => existsSync(d));
}

/**
 * Folder names (never files, never contents) under `path`, for the teacher's folder picker.
 * Hidden folders are skipped. Starts at the home folder.
 */
export function browseFolders(path?: string, home = process.env.GURO_HOME ?? homedir()) {
  let dir: string;
  try { dir = realpathSync(path?.trim() || home); } catch { dir = realpathSync(home); }
  let folders: string[] = [];
  try {
    folders = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('$'))
      .map((e) => e.name).sort((a, b) => a.localeCompare(b)).slice(0, 300);
  } catch { /* no permission: show no subfolders */ }
  const parent = dirname(dir);
  return { path: dir, parent: parent === dir ? null : parent, home, roots: roots(), folders: folders.map((name) => ({ name, path: join(dir, name) })) };
}
