// Progress, attempts and badges for LEVELS.
import type { Db } from "../db/connection.ts";
import type { Attempt, ItemResult, Progress, QuestKind } from "./types.ts";

export function getProgress(db: Db, studentId: string): Progress {
  db.prepare("INSERT OR IGNORE INTO lv_progress (student_id) VALUES (?)").run(studentId);
  return db.prepare("SELECT * FROM lv_progress WHERE student_id = ?").get(studentId) as unknown as Progress;
}

export function updateProgress(db: Db, studentId: string, patch: Partial<Omit<Progress, "student_id">>): void {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE lv_progress SET ${sets} WHERE student_id = ?`).run(...keys.map((k) => patch[k] as string | number | null), studentId);
}

export function setLevel(db: Db, studentId: string, level: number): void {
  getProgress(db, studentId);
  updateProgress(db, studentId, { level, placed: 1, placement_round: 1 });
}

export function resetPlacement(db: Db, studentId: string): void {
  getProgress(db, studentId);
  updateProgress(db, studentId, { level: 1, placed: 0, placement_round: 1 });
}

export interface NewAttempt {
  studentId: string;
  questId: string;
  level: number;
  kind: QuestKind;
  score: number;
  total: number;
  passed: boolean;
  results: ItemResult[];
}

export function addAttempt(db: Db, a: NewAttempt): number {
  const r = db.prepare(
    `INSERT INTO lv_attempts (student_id, quest_id, level, kind, score, total, passed, results)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(a.studentId, a.questId, a.level, a.kind, a.score, a.total, a.passed ? 1 : 0, JSON.stringify(a.results));
  return Number(r.lastInsertRowid);
}

export function listAttempts(db: Db, studentId: string, limit = 200): Attempt[] {
  return db.prepare("SELECT * FROM lv_attempts WHERE student_id = ? ORDER BY id DESC LIMIT ?")
    .all(studentId, limit) as unknown as Attempt[];
}

export interface BestRow {
  quest_id: string;
  best: number;
  total: number;
  passed: number;
  tries: number;
}

/** Best score per quest for a student. */
export function bestByQuest(db: Db, studentId: string): Map<string, BestRow> {
  const rows = db.prepare(
    `SELECT quest_id, MAX(score) AS best, MAX(total) AS total, MAX(passed) AS passed, COUNT(*) AS tries
     FROM lv_attempts WHERE student_id = ? GROUP BY quest_id`,
  ).all(studentId) as unknown as BestRow[];
  return new Map(rows.map((r) => [r.quest_id, r]));
}

export function countAttempts(db: Db, studentId: string, kind?: QuestKind): number {
  const row = kind
    ? db.prepare("SELECT COUNT(*) AS n FROM lv_attempts WHERE student_id = ? AND kind = ?").get(studentId, kind)
    : db.prepare("SELECT COUNT(*) AS n FROM lv_attempts WHERE student_id = ?").get(studentId);
  return Number((row as { n: number }).n);
}

export function listBadges(db: Db, studentId: string): { badge: string; earned_at: string }[] {
  return db.prepare("SELECT badge, earned_at FROM lv_badges WHERE student_id = ? ORDER BY earned_at")
    .all(studentId) as unknown as { badge: string; earned_at: string }[];
}

/** Awards badges not yet held; returns the ones newly earned. */
export function awardBadges(db: Db, studentId: string, badges: string[]): string[] {
  const fresh: string[] = [];
  const ins = db.prepare("INSERT OR IGNORE INTO lv_badges (student_id, badge) VALUES (?, ?)");
  for (const b of badges) if (ins.run(studentId, b).changes > 0) fresh.push(b);
  return fresh;
}

/** Class-wide rows for the teacher overview. */
export function listProgressRows(db: Db, section?: string): (Progress & { name: string; section: string })[] {
  const where = section ? "WHERE s.section = ?" : "";
  const sql = `SELECT s.name, s.section, s.id AS student_id,
      COALESCE(p.level, 1) AS level, COALESCE(p.xp, 0) AS xp, COALESCE(p.streak, 0) AS streak,
      p.last_active, COALESCE(p.placed, 0) AS placed, COALESCE(p.placement_round, 1) AS placement_round,
      COALESCE(p.reviews, 0) AS reviews
    FROM students s LEFT JOIN lv_progress p ON p.student_id = s.id ${where} ORDER BY s.section, s.name`;
  const stmt = db.prepare(sql);
  return (section ? stmt.all(section) : stmt.all()) as unknown as (Progress & { name: string; section: string })[];
}
