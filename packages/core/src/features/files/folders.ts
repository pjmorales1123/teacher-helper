import { existsSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Db } from '../../lib/db.ts';

const KEY = 'readFolders';

/** Usual places teachers keep files, offered as one-click suggestions. */
export function suggestedFolders(home = process.env.GURO_HOME ?? homedir()): string[] {
  return ['Documents', 'Desktop', 'Downloads', 'Pictures', 'OneDrive/Documents', 'OneDrive/Desktop']
    .map((d) => join(home, d)).filter((d) => existsSync(d) && statSync(d).isDirectory());
}

/** Folders the teacher allowed the AI to read. Nothing is readable until the teacher allows it. */
export function createFolderSettings(db: Db) {
  return {
    list(): string[] {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY) as { value: string } | undefined;
      return row ? (JSON.parse(row.value) as string[]) : [];
    },
    /** Whether the AI may search the web (off until the teacher turns it on). */
    web(): boolean {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('webResearch') as { value: string } | undefined;
      return row?.value === 'true';
    },
    setWeb(on: boolean): boolean {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('webResearch', String(on === true));
      return on === true;
    },
    set(folders: string[]): string[] {
      const clean = [...new Set(folders.filter((f) => typeof f === 'string' && isAbsolute(f) && existsSync(f) && statSync(f).isDirectory()).map((f) => realpathSync(f)))];
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(KEY, JSON.stringify(clean));
      return clean;
    },
  };
}
export type FolderSettings = ReturnType<typeof createFolderSettings>;

/** Resolves a path and returns it only when it is inside an allowed folder (symlinks resolved). */
export function insideAllowed(path: string, folders: string[]): string | null {
  if (!path || !folders.length) return null;
  let real: string;
  try { real = realpathSync(resolve(path)); } catch { return null; }
  return folders.some((f) => { const rel = relative(f, real); return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)); }) ? real : null;
}

export const SEP = sep;
