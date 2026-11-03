import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type Db = DatabaseSync;

const MIGRATIONS = [
  `CREATE TABLE documents (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('docx','xlsx','pptx')),
     version INTEGER NOT NULL DEFAULT 1,
     size INTEGER NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE versions (
     doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
     version INTEGER NOT NULL,
     size INTEGER NOT NULL,
     note TEXT,
     created_at TEXT NOT NULL,
     PRIMARY KEY (doc_id, version)
   )`,
  `CREATE TABLE messages (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('user','assistant')),
     text TEXT NOT NULL,
     edits_json TEXT,
     created_at TEXT NOT NULL
   )`,
];

/** Opens (or creates) the SQLite database and applies pending migrations. */
export function openDb(dataDir: string): Db {
  if (dataDir !== ':memory:') mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dataDir === ':memory:' ? ':memory:' : join(dataDir, 'guro.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    db.exec(MIGRATIONS[v]);
    db.exec(`PRAGMA user_version = ${v + 1}`);
    db.exec('COMMIT');
  }
  return db;
}

export const now = () => new Date().toISOString();
