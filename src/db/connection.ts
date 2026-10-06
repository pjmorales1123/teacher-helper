// Opens the SQLite database (Node's built-in driver, no native build step)
// and applies the schema. One connection is shared by the whole process.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "./schema.ts";

export type Db = DatabaseSync;

export function openDatabase(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  migrate(db);
  return db;
}

/** Add columns introduced after the first release. Safe to run every start. */
function migrate(db: Db): void {
  const cols = (db.prepare("PRAGMA table_info(activities)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("section")) db.exec("ALTER TABLE activities ADD COLUMN section TEXT NOT NULL DEFAULT ''");
}

/** Read a settings value, falling back to the given default. */
export function getSetting(db: Db, key: string, fallback: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(db: Db, key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
