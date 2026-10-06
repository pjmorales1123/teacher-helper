// Overview: per-activity submission counts and who is still missing.
import type { Db } from "../../db/connection.ts";

export interface ActivityOverview {
  id: number;
  title: string;
  component: string;
  term: number;
  section: string;
  due_date: string | null;
  formative: number;
  total: number;
  submitted: number; // waiting for the teacher (submitted or prescored)
  approved: number;
  missing: { id: string; name: string; section: string }[];
}

export interface Overview {
  students: number;
  toCheck: number;
  pendingClaims: number;
  missingTotal: number;
  activities: ActivityOverview[];
}

function count(db: Db, sql: string): number {
  return Number((db.prepare(sql).get() as { n: number }).n);
}

export function buildOverview(db: Db, section?: string): Overview {
  const students = (section
    ? db.prepare("SELECT id, name, section FROM students WHERE section = ? ORDER BY name").all(section)
    : db.prepare("SELECT id, name, section FROM students ORDER BY section, name").all()
  ) as unknown as { id: string; name: string; section: string }[];
  const activities = (section
    ? db.prepare("SELECT id, title, component, term, section, due_date, formative FROM activities WHERE section = '' OR section = ? ORDER BY term, due_date, created_at").all(section)
    : db.prepare("SELECT id, title, component, term, section, due_date, formative FROM activities ORDER BY term, due_date, created_at").all()
  ) as unknown as Omit<ActivityOverview, "total" | "submitted" | "approved" | "missing">[];
  const subs = db
    .prepare("SELECT activity_id, student_id, status FROM submissions")
    .all() as unknown as { activity_id: number; student_id: string; status: string }[];

  const byActivity = new Map<number, Map<string, string>>();
  for (const s of subs) {
    if (!byActivity.has(s.activity_id)) byActivity.set(s.activity_id, new Map());
    byActivity.get(s.activity_id)!.set(s.student_id, s.status);
  }

  let missingTotal = 0;
  const rows = activities.map((a): ActivityOverview => {
    const statuses = byActivity.get(a.id) ?? new Map<string, string>();
    const audience = a.section ? students.filter((s) => s.section === a.section) : students;
    const missing = audience.filter((s) => !statuses.has(s.id));
    missingTotal += missing.length;
    const values = audience.filter((s) => statuses.has(s.id)).map((s) => statuses.get(s.id)!);
    return {
      ...a,
      total: audience.length,
      submitted: values.filter((v) => v !== "approved").length,
      approved: values.filter((v) => v === "approved").length,
      missing,
    };
  });

  return {
    students: students.length,
    toCheck: count(db, "SELECT COUNT(*) AS n FROM submissions WHERE status != 'approved'"),
    pendingClaims: count(db, "SELECT COUNT(*) AS n FROM effort_claims WHERE status = 'pending'"),
    missingTotal,
    activities: rows,
  };
}
