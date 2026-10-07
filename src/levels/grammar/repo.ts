// Grammar Rush runs in SQLite.
import type { Db } from "../../db/connection.ts";
import type { RunResult } from "./types.ts";

export interface RunRow {
  id: number; student_id: string; tier: number; score: number; total: number; xp: number; hearts: number; results: string; created_at: string;
}

export function addRun(db: Db, r: { studentId: string; tier: number; score: number; total: number; xp: number; hearts: number; results: RunResult[] }): number {
  const row = db.prepare("INSERT INTO lv_grammar_runs (student_id, tier, score, total, xp, hearts, results) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(r.studentId, r.tier, r.score, r.total, r.xp, r.hearts, JSON.stringify(r.results));
  return Number(row.lastInsertRowid);
}

export function listRuns(db: Db, studentId: string, limit = 100): RunRow[] {
  return db.prepare("SELECT * FROM lv_grammar_runs WHERE student_id = ? ORDER BY id DESC LIMIT ?").all(studentId, limit) as unknown as RunRow[];
}

export function bestByTier(db: Db, studentId: string): Map<number, number> {
  const rows = db.prepare("SELECT tier, MAX(score) AS best FROM lv_grammar_runs WHERE student_id = ? GROUP BY tier").all(studentId) as unknown as { tier: number; best: number }[];
  return new Map(rows.map((r) => [r.tier, Number(r.best)]));
}

export function runsOnDay(db: Db, studentId: string, day: string): { n: number; xp: number } {
  const row = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(xp), 0) AS xp FROM lv_grammar_runs WHERE student_id = ? AND substr(created_at, 1, 10) = ?").get(studentId, day) as { n: number; xp: number };
  return { n: Number(row.n), xp: Number(row.xp) };
}

/** Runs for a section (or all) for the teacher's topic heatmap. */
export function listClassRuns(db: Db, section?: string, limit = 2000): RunRow[] {
  const sql = `SELECT r.* FROM lv_grammar_runs r JOIN students s ON s.id = r.student_id ${section ? "WHERE s.section = ?" : ""} ORDER BY r.id DESC LIMIT ?`;
  const stmt = db.prepare(sql);
  return (section ? stmt.all(section, limit) : stmt.all(limit)) as unknown as RunRow[];
}
