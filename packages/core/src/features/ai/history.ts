import { now, type Db } from '../../lib/db.ts';
import type { AiEdit } from './types.ts';

export interface ChatMessage { id: number; role: 'user' | 'assistant'; text: string; edits: AiEdit[]; created_at: string }

/** Per-document chat log, kept locally in SQLite like the M365 add-in keeps it in the browser. */
export function createHistory(db: Db) {
  return {
    add(docId: string, role: ChatMessage['role'], text: string, edits: AiEdit[] = []) {
      db.prepare('INSERT INTO messages (doc_id, role, text, edits_json, created_at) VALUES (?,?,?,?,?)')
        .run(docId, role, text, edits.length ? JSON.stringify(edits) : null, now());
    },
    list(docId: string, limit = 100): ChatMessage[] {
      const rows = db.prepare('SELECT * FROM messages WHERE doc_id = ? ORDER BY id DESC LIMIT ?').all(docId, limit) as any[];
      return rows.reverse().map((r) => ({
        id: r.id, role: r.role, text: r.text, created_at: r.created_at,
        edits: r.edits_json ? JSON.parse(r.edits_json) : [],
      }));
    },
    /** Short recent history sent with each turn, so follow-ups like "shorter" work. */
    recent(docId: string, turns = 6) {
      return this.list(docId, turns).map(({ role, text }) => ({ role, text: text.slice(0, 1500) }));
    },
    clear(docId: string) { db.prepare('DELETE FROM messages WHERE doc_id = ?').run(docId); },
  };
}

export type History = ReturnType<typeof createHistory>;
