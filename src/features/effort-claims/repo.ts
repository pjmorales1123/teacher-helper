import type { Db } from "../../db/connection.ts";
import type { ClaimStatus, EffortClaim } from "../../lib/types.ts";

export interface ClaimRow extends EffortClaim {
  student_name: string;
  section: string;
  activity_title: string;
  component: string;
  term: number;
}

const JOINED = `
  SELECT c.*, st.name AS student_name, st.section, a.title AS activity_title, a.component, a.term
  FROM effort_claims c
  JOIN students st ON st.id = c.student_id
  JOIN activities a ON a.id = c.activity_id`;

export function listClaims(db: Db, status?: string): ClaimRow[] {
  const sql = status ? `${JOINED} WHERE c.status = ? ORDER BY c.created_at DESC` : `${JOINED} ORDER BY c.created_at DESC`;
  return (status ? db.prepare(sql).all(status) : db.prepare(sql).all()) as unknown as ClaimRow[];
}

export function listClaimsForStudent(db: Db, studentId: string): ClaimRow[] {
  return db.prepare(`${JOINED} WHERE c.student_id = ? ORDER BY c.created_at DESC`).all(studentId) as unknown as ClaimRow[];
}

export function createClaim(db: Db, c: { studentId: string; activityId: number; note: string }): number {
  const r = db
    .prepare("INSERT INTO effort_claims (student_id, activity_id, note) VALUES (?, ?, ?)")
    .run(c.studentId, c.activityId, c.note);
  return Number(r.lastInsertRowid);
}

export function decideClaim(db: Db, id: number, status: ClaimStatus, points: number, teacherNote: string): boolean {
  return (
    db
      .prepare(
        "UPDATE effort_claims SET status = ?, points = ?, teacher_note = ?, decided_at = datetime('now') WHERE id = ?",
      )
      .run(status, points, teacherNote, id).changes > 0
  );
}

/** Approved extra points per (term, component) for one student. */
export function approvedExtraPoints(db: Db, studentId: string): { term: number; component: string; points: number }[] {
  return db
    .prepare(
      `SELECT a.term, a.component, SUM(c.points) AS points
       FROM effort_claims c JOIN activities a ON a.id = c.activity_id
       WHERE c.student_id = ? AND c.status = 'approved' AND a.formative = 0
       GROUP BY a.term, a.component`,
    )
    .all(studentId) as unknown as { term: number; component: string; points: number }[];
}
