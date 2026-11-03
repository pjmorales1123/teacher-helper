import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { now, type Db } from '../../lib/db.ts';
import type { DocKind } from './kinds.ts';

export interface DocumentMeta {
  id: string;
  name: string;
  kind: DocKind;
  version: number;
  size: number;
  created_at: string;
  updated_at: string;
}

export interface VersionMeta { version: number; size: number; note: string | null; created_at: string }

/** Keeps every saved version on disk as <dataDir>/files/<id>/v<n>.<kind>. */
export function createDocumentStore(db: Db, dataDir: string) {
  const dirOf = (id: string) => join(dataDir, 'files', id);
  const pathOf = (d: Pick<DocumentMeta, 'id' | 'kind'>, v: number) => join(dirOf(d.id), `v${v}.${d.kind}`);

  async function writeAtomic(path: string, bytes: Uint8Array) {
    const tmp = `${path}.tmp-${process.pid}`;
    await writeFile(tmp, bytes);
    await rename(tmp, path);
  }

  return {
    list(): DocumentMeta[] {
      return db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all() as unknown as DocumentMeta[];
    },

    get(id: string): DocumentMeta | undefined {
      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as unknown as DocumentMeta | undefined;
    },

    versions(id: string): VersionMeta[] {
      return db.prepare('SELECT version, size, note, created_at FROM versions WHERE doc_id = ? ORDER BY version DESC')
        .all(id) as unknown as VersionMeta[];
    },

    async create(name: string, kind: DocKind, bytes: Uint8Array): Promise<DocumentMeta> {
      const doc: DocumentMeta = { id: randomUUID(), name, kind, version: 1, size: bytes.length, created_at: now(), updated_at: now() };
      await mkdir(dirOf(doc.id), { recursive: true });
      await writeAtomic(pathOf(doc, 1), bytes);
      db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?,?)')
        .run(doc.id, doc.name, doc.kind, 1, doc.size, doc.created_at, doc.updated_at);
      db.prepare('INSERT INTO versions VALUES (?,?,?,?,?)').run(doc.id, 1, doc.size, 'Uploaded', doc.created_at);
      return doc;
    },

    async read(doc: DocumentMeta, version = doc.version): Promise<Buffer> {
      return readFile(pathOf(doc, version));
    },

    /** Saves bytes as a new version. Old versions stay on disk as backups. */
    async save(doc: DocumentMeta, bytes: Uint8Array, note: string | null): Promise<DocumentMeta> {
      const version = doc.version + 1;
      await writeAtomic(pathOf(doc, version), bytes);
      const ts = now();
      db.prepare('UPDATE documents SET version = ?, size = ?, updated_at = ? WHERE id = ?').run(version, bytes.length, ts, doc.id);
      db.prepare('INSERT INTO versions VALUES (?,?,?,?,?)').run(doc.id, version, bytes.length, note, ts);
      return { ...doc, version, size: bytes.length, updated_at: ts };
    },

    rename(doc: DocumentMeta, name: string): DocumentMeta {
      db.prepare('UPDATE documents SET name = ? WHERE id = ?').run(name, doc.id);
      return { ...doc, name };
    },

    async remove(doc: DocumentMeta): Promise<void> {
      db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
      await rm(dirOf(doc.id), { recursive: true, force: true });
    },
  };
}

export type DocumentStore = ReturnType<typeof createDocumentStore>;
