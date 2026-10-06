import type { Db } from "../../db/connection.ts";
import type { Activity } from "../../lib/types.ts";

export type ActivityInput = Omit<Activity, "id" | "created_at">;

export function listActivities(db: Db): Activity[] {
  return db
    .prepare("SELECT * FROM activities ORDER BY term, component, created_at DESC")
    .all() as unknown as Activity[];
}

export function getActivity(db: Db, id: number): Activity | undefined {
  return db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as unknown as Activity | undefined;
}

export function createActivity(db: Db, a: ActivityInput): number {
  const result = db
    .prepare(
      `INSERT INTO activities (title, component, term, max_score, formative, competencies, instructions, rubric, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(a.title, a.component, a.term, a.max_score, a.formative, a.competencies, a.instructions, a.rubric, a.due_date);
  return Number(result.lastInsertRowid);
}

export function updateActivity(db: Db, id: number, a: ActivityInput): boolean {
  const result = db
    .prepare(
      `UPDATE activities SET title = ?, component = ?, term = ?, max_score = ?, formative = ?,
         competencies = ?, instructions = ?, rubric = ?, due_date = ? WHERE id = ?`,
    )
    .run(a.title, a.component, a.term, a.max_score, a.formative, a.competencies, a.instructions, a.rubric, a.due_date, id);
  return result.changes > 0;
}

export function deleteActivity(db: Db, id: number): boolean {
  return db.prepare("DELETE FROM activities WHERE id = ?").run(id).changes > 0;
}
