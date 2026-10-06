// Daily XP log: powers the daily goal and the weekly section leaderboard.
import type { Db } from "../db/connection.ts";
import { addDays } from "./dates.ts";

export function logXp(db: Db, studentId: string, day: string, xp: number): void {
  if (xp > 0) db.prepare("INSERT INTO lv_xp_log (student_id, day, xp) VALUES (?, ?, ?)").run(studentId, day, xp);
}

export function xpOnDay(db: Db, studentId: string, day: string): number {
  const row = db.prepare("SELECT COALESCE(SUM(xp), 0) AS n FROM lv_xp_log WHERE student_id = ? AND day = ?").get(studentId, day) as { n: number };
  return Number(row.n);
}

export interface LeaderRow {
  id: string;
  name: string;
  xp: number;
  rank: number;
}

/** XP earned in the last 7 days by every student in a section, best first. Levels are never included. */
export function weeklyLeaderboard(db: Db, section: string, today: string): LeaderRow[] {
  const since = addDays(today, -6);
  const rows = db.prepare(
    `SELECT s.id, s.name, COALESCE(SUM(x.xp), 0) AS xp
     FROM students s LEFT JOIN lv_xp_log x ON x.student_id = s.id AND x.day >= ?
     WHERE s.section = ? GROUP BY s.id ORDER BY xp DESC, s.name`,
  ).all(since, section) as unknown as Omit<LeaderRow, "rank">[];
  let rank = 0;
  let last = -1;
  return rows.map((r, i) => {
    if (r.xp !== last) { rank = i + 1; last = r.xp; }
    return { ...r, xp: Number(r.xp), rank };
  });
}
