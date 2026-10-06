import type { Db } from "../../db/connection.ts";
import type { Submission } from "../../lib/types.ts";

export interface SubmissionRow extends Submission {
  student_name: string;
  section: string;
  activity_title: string;
  component: string;
  term: number;
  max_score: number;
}

const JOINED = `
  SELECT s.*, st.name AS student_name, st.section, a.title AS activity_title,
         a.component, a.term, a.max_score
  FROM submissions s
  JOIN students st ON st.id = s.student_id
  JOIN activities a ON a.id = s.activity_id`;

export function listSubmissions(db: Db, filter: { activityId?: number; status?: string; section?: string }): SubmissionRow[] {
  const where: string[] = [];
  const params: (number | string)[] = [];
  if (filter.activityId) {
    where.push("s.activity_id = ?");
    params.push(filter.activityId);
  }
  if (filter.status) {
    where.push("s.status = ?");
    params.push(filter.status);
  }
  if (filter.section) {
    where.push("st.section = ?");
    params.push(filter.section);
  }
  const sql = `${JOINED} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY s.submitted_at DESC`;
  return db.prepare(sql).all(...params) as unknown as SubmissionRow[];
}

export function getSubmission(db: Db, id: number): SubmissionRow | undefined {
  return db.prepare(`${JOINED} WHERE s.id = ?`).get(id) as unknown as SubmissionRow | undefined;
}

export function listForStudent(db: Db, studentId: string): Submission[] {
  return db.prepare("SELECT * FROM submissions WHERE student_id = ?").all(studentId) as unknown as Submission[];
}

/** Create or replace a student's submission. Returns the submission id. */
export function upsertSubmission(
  db: Db,
  s: { activityId: number; studentId: string; kind: "text" | "image"; content: string },
): number {
  db.prepare(
    `INSERT INTO submissions (activity_id, student_id, kind, content)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(activity_id, student_id) DO UPDATE SET
       kind = excluded.kind, content = excluded.content, status = 'submitted',
       draft_score = NULL, draft_feedback = NULL, score = NULL, feedback = NULL,
       submitted_at = datetime('now'), approved_at = NULL`,
  ).run(s.activityId, s.studentId, s.kind, s.content);
  const row = db
    .prepare("SELECT id FROM submissions WHERE activity_id = ? AND student_id = ?")
    .get(s.activityId, s.studentId) as { id: number };
  return row.id;
}

export function saveDraft(db: Db, id: number, score: number, feedback: string): void {
  db.prepare(
    "UPDATE submissions SET draft_score = ?, draft_feedback = ?, status = 'prescored' WHERE id = ? AND status != 'approved'",
  ).run(score, feedback, id);
}

export function approveScore(db: Db, id: number, score: number, feedback: string): void {
  db.prepare(
    "UPDATE submissions SET score = ?, feedback = ?, status = 'approved', approved_at = datetime('now') WHERE id = ?",
  ).run(score, feedback, id);
}

export function reopenSubmission(db: Db, id: number): void {
  db.prepare(
    "UPDATE submissions SET score = NULL, feedback = NULL, approved_at = NULL, status = CASE WHEN draft_score IS NULL THEN 'submitted' ELSE 'prescored' END WHERE id = ?",
  ).run(id);
}
